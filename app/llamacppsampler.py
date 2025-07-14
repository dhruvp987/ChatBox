import llama_cpp


class CBSampler:
    def __init__(self, temp=0.8, top_k=40, min_p=0.05, top_p=0.95):
        smpl_params = llama_cpp.llama_sampler_chain_default_params()
        self._smpl = llama_cpp.llama_sampler_chain_init(smpl_params)
        llama_cpp.llama_sampler_chain_add(
            self._smpl, llama_cpp.llama_sampler_init_temp(temp)
        )
        llama_cpp.llama_sampler_chain_add(
            self._smpl, llama_cpp.llama_sampler_init_top_k(top_k)
        )
        llama_cpp.llama_sampler_chain_add(
            self._smpl, llama_cpp.llama_sampler_init_min_p(min_p, 1)
        )
        llama_cpp.llama_sampler_chain_add(
            self._smpl, llama_cpp.llama_sampler_init_top_p(top_p, 1)
        )
        llama_cpp.llama_sampler_chain_add(
            self._smpl, llama_cpp.llama_sampler_init_dist(llama_cpp.LLAMA_DEFAULT_SEED)
        )

    @property
    def llama_cpp_sampler(self):
        return self._smpl

    def __del__(self):
        llama_cpp.llama_sampler_free(self._smpl)
