import sys
from llamacppllm import LlamaCppLlm

# A context window that doesn't take too much resources, making
# it easier to work with for now
MAX_CTX = 2048

EXIT_STR = '/exit'

MAX_CMD_ARGS = 2
def usage_msg():
    return 'usage: chatbox model_path'


def main():
    if len(sys.argv) != MAX_CMD_ARGS:
        print(usage_msg(), file=sys.stderr)
        sys.exit(1)

    llm = LlamaCppLlm(sys.argv[1], MAX_CTX)

    while True:
        prompt = input(f'Enter your prompt ({EXIT_STR} to exit): ')
        if prompt == EXIT_STR:
            break
        print(llm.chat(prompt), '\n')


if __name__ == "__main__":
    main()
