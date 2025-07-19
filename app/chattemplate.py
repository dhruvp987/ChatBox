from jinja2.sandbox import ImmutableSandboxedEnvironment
import hft_chat_temp_utils as utils


class Jinja2ChatTemplate:
    LLAMA2_TEMP = "{%- for msg in messages -%}{%- if loop.first and msg['role'] == 'system' -%}{{ '<s>[INST] <<SYS>>\n' + msg['content'] + '\n<</SYS>>\n\n' }}{%- elif loop.index0 == 1 and loop.previtem['role'] == 'system' -%}{{ msg['content'] + ' [/INST]' }}{%- elif msg['role'] == 'user' -%}{{ '<s>[INST] ' + msg['content'] + ' [/INST]' }}{%- elif msg['role'] == 'assistant' -%}{{ ' ' + msg['content'] + '</s>\n' }}{%- endif -%}{%- endfor -%}"

    def __init__(self, template_str):
        environ = ImmutableSandboxedEnvironment(trim_blocks=True, lstrip_blocks=True)
        environ.filters["tojson"] = utils.tojson
        environ.globals["raise_exception"] = utils.raise_exception
        environ.globals["strftime_now"] = utils.strftime_now
        self._template = environ.from_string(template_str)

    def render(self, chat):
        return self._template.render(messages=chat.msgs, add_generation_prompt=True)
