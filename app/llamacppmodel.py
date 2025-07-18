import ctypes
import llama_cpp

INT32_MAX = 2147483647


def set_llama_cpp_batch(batch, tok_arr, n_toks, tok_start, n_past):
    batch.n_tokens = n_toks
    for i in range(tok_start, tok_start + n_toks):
        batch.token[i - tok_start] = tok_arr[i]
        batch.pos[i - tok_start] = i - tok_start + n_past
        batch.seq_id[i - tok_start][0] = 0
        batch.n_seq_id[i - tok_start] = 1
        batch.logits[i - tok_start] = False
    batch.logits[n_toks - 1] = True


def llama_init():
    llama_cpp.llama_backend_init()


class LlamaCppError(Exception):
    pass


class LlamaCppModel:
    def __init__(self, model_path, n_gpu_layers=INT32_MAX):
        model_params = llama_cpp.llama_model_default_params()
        # The largest 32-bit integer is used by default because
        # the n_gpu_layers model parameter is of type int32_t,
        # and we want to offload as much work to the GPU as possible
        model_params.n_gpu_layers = n_gpu_layers

        self._model = llama_cpp.llama_load_model_from_file(model_path, model_params)
        if self._model is None:
            raise LlamaCppError("Could not load model")

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
    def __init__(self, model, n_ctx=4096, n_batch=512, offload_kqv=True):
        self._model = model
        self._n_ctx = n_ctx
        self._n_batch = n_batch

        ctx_params = llama_cpp.llama_context_default_params()
        ctx_params.n_ctx = n_ctx
        ctx_params.n_batch = n_batch
        ctx_params.n_ubatch = n_batch
        ctx_params.offload_kqv = offload_kqv

        self._ctx = llama_cpp.llama_new_context_with_model(model.model, ctx_params)
        if self._ctx is None:
            raise LlamaCppError("Could not create context")

        self._vocab = model.vocab

        self._batch = llama_cpp.llama_batch_init(n_batch, 0, 1)

    def complete_chat(self, chat, sampler):
        # Get the prompt's number of tokens to create an accurately-sized
        # array to store those tokens
        prmpt_n_toks = -llama_cpp.llama_tokenize(
            self._vocab, chat, len(chat), None, 0, True, True
        )
        if prmpt_n_toks >= self._n_ctx:
            raise LlamaCppError("Prompt fills context size")

        prmpt_tok_arr = (llama_cpp.llama_token * prmpt_n_toks)()
        res = llama_cpp.llama_tokenize(
            self._vocab,
            chat,
            len(chat),
            prmpt_tok_arr,
            prmpt_n_toks,
            True,
            True,
        )
        if res < 0:
            raise LlamaCppError("Could not tokenize the prompt")

        for i in range(0, prmpt_n_toks, self._n_batch):
            n_bth_or_n_toks = min(prmpt_n_toks, self._n_batch)
            set_llama_cpp_batch(
                self._batch, prmpt_tok_arr, min(prmpt_n_toks - i, n_bth_or_n_toks), i, i
            )
            if llama_cpp.llama_decode(self._ctx, self._batch) < 0:
                raise LlamaCppError("Could not decode prompt")

        n_toks_gen = 0
        while prmpt_n_toks + n_toks_gen + 1 < self._n_ctx:
            tok_id = llama_cpp.llama_sampler_sample(
                sampler.llama_cpp_sampler, self._ctx, -1
            )
            if llama_cpp.llama_vocab_is_eog(self._vocab, tok_id):
                break
            n_toks_gen += 1

            tok_buf = bytes(128)
            res = llama_cpp.llama_token_to_piece(
                self._vocab, tok_id, tok_buf, 128, 0, True
            )
            if res < 0:
                raise LlamaCppError("Could not convert generated token to string")

            tok_str = tok_buf.rstrip(b"\x00").decode()

            yield tok_str

            ind_tok_arr = (llama_cpp.llama_token * 1)()
            ind_tok_arr[0] = tok_id
            set_llama_cpp_batch(
                self._batch, ind_tok_arr, 1, 0, prmpt_n_toks + n_toks_gen - 1
            )

            if llama_cpp.llama_decode(self._ctx, self._batch) < 0:
                raise LlamaCppError("Could not decode generated tokens")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        llama_cpp.llama_free(self._ctx)
        llama_cpp.llama_batch_free(self._batch)
