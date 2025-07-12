from jinja2 import Environment


class Jinja2ChatTemplate:
    LLAMA2_TEMP = "{%- for msg in messages -%}{%- if loop.first and msg['role'] == 'system' -%}{{ '<s>[INST] <<SYS>>\n' + msg['content'] + '\n<</SYS>>\n\n' }}{%- elif loop.index0 == 1 and loop.previtem['role'] == 'system' -%}{{ msg['content'] + ' [/INST]' }}{%- elif msg['role'] == 'user' -%}{{ '<s>[INST] ' + msg['content'] + ' [/INST]' }}{%- elif msg['role'] == 'assistant' -%}{{ ' ' + msg['content'] + '</s>\n' }}{%- endif -%}{%- endfor -%}"

    def __init__(self, template_str):
        environ = Environment()
        self._template = environ.from_string(template_str)

    def render(self, chat):
        return self._template.render(messages=chat.msgs, add_generation_prompt=True)
