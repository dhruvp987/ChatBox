import llama_cpp


class CBSampler:
    def __init__(self, min_p=0.05, temp=0.8):
        smpl_params = llama_cpp.llama_sampler_chain_default_params()
        self._smpl = llama_cpp.llama_sampler_chain_init(smpl_params)
        llama_cpp.llama_sampler_chain_add(
            self._smpl, llama_cpp.llama_sampler_init_min_p(min_p, 1)
        )
        llama_cpp.llama_sampler_chain_add(
            self._smpl, llama_cpp.llama_sampler_init_temp(temp)
        )
        llama_cpp.llama_sampler_chain_add(
            self._smpl, llama_cpp.llama_sampler_init_dist(llama_cpp.LLAMA_DEFAULT_SEED)
        )

    @property
    def llama_cpp_sampler(self):
        return self._smpl

    def __del__(self):
        llama_cpp.llama_sampler_free(self._smpl)
