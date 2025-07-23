# ChatBox
Chat with local models over the web using a friendly interface.
## Installation
### Prerequisites
- uv (a Python package manager)
- C/C++ compiler
### Steps
1. Clone the repository to a folder on your system
2. Go to the cloned folder
3. (If using GPU) Set your CMAKE_ARGS environment variable before building llama-cpp-python
	- Refer to llama-cpp-python’s installation instructions to choose a backend
	- Example: using Vulkan backend
		- `CMAKE_ARGS=“-DGGML_VULKAN=on”`
	- *NOTE*: If using MinGW on Windows, make sure gcc and g++ are in your path and add `-G “MinGW Makefiles”` to CMAKE_ARGS
	- Example: using MinGW and Vulkan backend
		- `$env:CMAKE_ARGS = ‘-G “MinGW Makefiles” -DGGML_VULKAN=on’`
4. Run `uv sync` to install dependencies
	- *NOTE*: Depending on your hardware,  llama-cpp-python may take a few moments to build. This is expected, as a C++ library is being built underneath 
## Usage
### Steps
1. Set the CB_MODEL_PATH environment variable with the path to a GGUF model
2. Run `uv run fastapi dev —-no-reload app/main.py` to start development server
	- *WARNING*: If using `fastapi dev`, make sure `—-no-reload` is set, or the model may be reloaded multiple times and possibly use excessive resources
3. Visit http://127.0.0.1:8000/ (or the URL FastAPI specifies)
### Environment Variables
Use these variables to customize ChatBox.

***Required***
- CB_MODEL_PATH: Path to a GGUF model

***Context Options***
- CB_CTX_SIZE: Context size (default: 4096)

***Sampler Options***
- CB_TEMP: Temperature (default: 0.8)
- CB_TOP_K: top-k (default: 40)
- CB_REP_PEN: Repetition Penalty (default: 1.1)
- CB_MIN_P: min-p (default: 0.05)
- CB_TOP_P: top-p (default: 0.95)
## License
Licensed under the MIT license