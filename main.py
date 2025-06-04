import sys
from llama_cpp import Llama

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

    llm = Llama(
        model_path=sys.argv[1],
        n_ctx=MAX_CTX,
        verbose=False
    )

    while True:
        prompt = input(f'Enter your prompt ({EXIT_STR} to exit): ')
        if prompt == EXIT_STR:
            break

        print(llm.create_chat_completion(
            messages = [
                {'role': 'user', 'content': prompt}
            ]
        )['choices'][0]['message']['content'], '\n')


if __name__ == "__main__":
    main()
