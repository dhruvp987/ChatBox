# ChatBox
```
*******************************************************************************
          |                   |                  |                     |
 _________|________________.=""_;=.______________|_____________________|_______
|                   |  ,-"_,=""     `"=.|                  |
|___________________|__"=._o`"-._        `"=.______________|___________________
          |                `"=._o`"=._      _`"=._                     |
 _________|_____________________:=._o "=._."_.-="'"=.__________________|_______
|                   |    __.--" , ; `"=._o." ,-"""-._ ".   |
|___________________|_._"  ,. .` ` `` ,  `"-._"-._   ". '__|___________________
          |           |o`"=._` , "` `; .". ,  "-._"-._; ;              |
 _________|___________| ;`-.o`"=._; ." ` '`."\` . "-._ /_______________|_______
|                   | |o;    `"-.o`"=._``  '` " ,__.--o;   |
|___________________|_| ;     (#) `-.o `"=.`_.--"_o.-; ;___|___________________
____/______/______/___|o;._    "      `".o|o_.--"    ;o;____/______/______/____
/______/______/______/_"=._o--._        ; | ;        ; ;/______/______/______/_
____/______/______/______/__"=._o--._   ;o|o;     _._;o;____/______/______/____
/______/______/______/______/____"=._o._; | ;_.--"o.--"_/______/______/______/_
____/______/______/______/______/_____"=.o|o_.--""___/______/______/______/____
/______/______/______/______/______/______/______/______/______/______/[TomekK]
*******************************************************************************
```
Easily chat with local models over the web using a friendly interface 💬.

Uses llama.cpp for excellent model support and solid performance on a wide range of hardware, lower and higher end 🦙.

### Demo 1: Get Rich 💸 (Qwen3 4B Unsloth Q4 GGUF with no thinking)
https://github.com/user-attachments/assets/6faae2c7-c3e3-4adb-8374-6fe39c83d35d

### Demo 2: Become U.S. President 🗽 (Hugging Face SmolLM3 3B Unsloth Q6 GGUF)
https://github.com/user-attachments/assets/e7fe4c49-27c3-49c5-830b-89ca636f6e03
## ⚡ Installation
### Prerequisites
- uv (a Python package manager)
- C/C++ compiler
### Steps
1. Clone the repository to a folder on your system
2. Go to the cloned folder
3. (If using GPU) Set your CMAKE_ARGS environment variable before building llama-cpp-python
	- Refer to llama-cpp-python’s installation instructions to choose a backend
	- Example: using Vulkan backend with Bash
		- `CMAKE_ARGS=“-DGGML_VULKAN=on”`
	- *NOTE*: If using MinGW on Windows, make sure gcc and g++ are in your path and add `-G “MinGW Makefiles”` to CMAKE_ARGS
	- Example: using MinGW and Vulkan backend with PowerShell
		- `$env:CMAKE_ARGS = ‘-G “MinGW Makefiles” -DGGML_VULKAN=on’`
4. Run `uv sync` to install dependencies
	- *NOTE*: Depending on your hardware,  llama-cpp-python may take a few moments to build. This is expected, as a C++ library is being built underneath 
## 🚀 Usage
### Steps for Local Use
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
## 💻📚 Tech Stack
- llama.cpp (using llama-cpp-python lib)
          - Used to run local models efficiently on a variety of hardware
- FastAPI
          - Used to develop a performant web backend
## 📎 License
Licensed under the MIT license
