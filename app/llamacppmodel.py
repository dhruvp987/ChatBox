import ctypes
import llama_cpp

INT32_MAX = 2147483647

class LlamaCppError(Exception):
    pass

class LlamaCppModel:
    def __init__(self, model_path, n_gpu_layers=INT32_MAX):
        model_params = llama_cpp.llama_model_default_params()
        # The largest 32-bit integer is used by default because
        # the n_gpu_layers model parameter is of type int32_t,
        # and we want to offload as much work to the GPU as possible
        model_params.n_gpu_layers = n_gpu_layers

        self._model = llama_cpp.llama_load_model_from_file(bytes(model_path, 'utf-8'), model_params)
        if self._model is None:
            raise LlamaCppError('Could not load model')

        self._vocab = llama_cpp.llama_model_get_vocab(self._model)

    @property
    def model(self):
        return self._model

    @property
    def vocab(self):
        return self._vocab

    # Returns template as string or None if GGUF doesn't provide one
    def chat_template(self):
        template = llama_cpp.llama_model_chat_template(self._model, None)
        return template.decode() if template is not None else None

    def __del__(self):
        llama_cpp.llama_free_model(self._model)


class LlamaCppContext:
    def __init__(self, model, n_ctx=4096, temp=0.8, top_k=40, repeat_pen=1.1, min_p=0.05, top_p=0.95):
        self._model = model
        self._n_ctx = n_ctx

        ctx_params = llama_cpp.llama_context_default_params()
        ctx_params.n_ctx = n_ctx
        self._ctx = llama_cpp.llama_new_context_with_model(model.model, ctx_params)
        if self._ctx is None:
            raise LlamaCppError('Could not create context')
        
        self._vocab = model.vocab

        smpl_params = llama_cpp.llama_sampler_chain_default_params()
        self._smpl = llama_cpp.llama_sampler_chain_init(smpl_params)
        llama_cpp.llama_sampler_chain_add(self._smpl, llama_cpp.llama_sampler_init_temp(temp))
        llama_cpp.llama_sampler_chain_add(self._smpl, llama_cpp.llama_sampler_init_top_k(top_k))
        llama_cpp.llama_sampler_chain_add(self._smpl, llama_cpp.llama_sampler_init_penalties(0, repeat_pen, 0, 0))
        llama_cpp.llama_sampler_chain_add(self._smpl, llama_cpp.llama_sampler_init_min_p(min_p, 1))
        llama_cpp.llama_sampler_chain_add(self._smpl, llama_cpp.llama_sampler_init_top_p(top_p, 1))
        # TODO: Replace greedy decoder with random selection of token from modified prob dist
        llama_cpp.llama_sampler_chain_add(self._smpl, llama_cpp.llama_sampler_init_greedy())

    def complete_chat(self, chat, chat_template):
        chat_fmtted = bytes(chat_template.render(chat), 'utf-8')

        # Get the prompt's number of tokens to create an accurately-sized
        # array to store those tokens
        prmpt_n_toks = -llama_cpp.llama_tokenize(
            self._vocab,
            chat_fmtted,
            len(chat_fmtted),
            None,
            0,
            True,
            True
        )
        if prmpt_n_toks > self._n_ctx:
            raise LlamaCppError('Prompt size exceeds context size')

        prmpt_tok_arr = (llama_cpp.llama_token * prmpt_n_toks)()
        res = llama_cpp.llama_tokenize(
            self._vocab,
            chat_fmtted,
            len(chat_fmtted),
            prmpt_tok_arr,
            prmpt_n_toks,
            True,
            True
        )
        if res < 0:
            raise LlamaCppError('Could not tokenize the prompt')

        batch = llama_cpp.llama_batch_get_one(prmpt_tok_arr, prmpt_n_toks)

        n_toks_gen = 0
        while prmpt_n_toks + n_toks_gen < self._n_ctx:
            if llama_cpp.llama_decode(self._ctx, batch) < 0:
                raise LlamaCppError('Could not decode batch of tokens')

            tok_id = llama_cpp.llama_sampler_sample(self._smpl, self._ctx, -1)
            if llama_cpp.llama_vocab_is_eog(self._vocab, tok_id):
                break
            n_toks_gen += 1

            tok_buf = bytes(128)
            res = llama_cpp.llama_token_to_piece(
                self._vocab,
                tok_id,
                tok_buf,
                128,
                0,
                True
            )
            if res < 0:
                raise LlamaCppError('Could not convert generated token to string')

            tok_str = tok_buf.rstrip(b'\x00').decode()

            yield tok_str

            ind_tok_arr = (llama_cpp.llama_token * 1)()
            ind_tok_arr[0] = tok_id
            batch = llama_cpp.llama_batch_get_one(ind_tok_arr, 1)

    def __del__(self):
        llama_cpp.llama_free(self._ctx)
        llama_cpp.llama_sampler_free(self._smpl)

