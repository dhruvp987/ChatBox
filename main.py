import sys
from llama_cpp import Llama

# A context window that doesn't take too much resources, making
# it easier to work with for now
MAX_CTX = 2048

MAX_CMD_ARGS = 3
def usage_msg():
    return 'usage: chatbox model_path prompt'


def main():
    if len(sys.argv) != MAX_CMD_ARGS:
        print(usage_msg(), file=sys.stderr)
        sys.exit(1)

    llm = Llama(
        model_path=sys.argv[1],
        n_ctx=MAX_CTX,
        verbose=False
    )

    print(llm.create_chat_completion(
        messages = [
            {'role': 'user', 'content': sys.argv[2]}
        ]
    )['choices'][0]['message']['content'])


if __name__ == "__main__":
    main()
