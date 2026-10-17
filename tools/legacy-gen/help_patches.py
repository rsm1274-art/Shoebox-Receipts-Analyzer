import os, re

HERE = os.path.dirname(__file__)
NL = "\n"
TOAST = "<!-- Toast Notification -->"


def _help_link(topic, title, closer):
    return ('<button onclick="openHelp(\'%s\')" class="text-link" title="%s">Help</button>' % (topic, title)
            + NL + '                <button onclick="%s" class="icon-btn"' % closer)


def patches():
    """(old, new) pairs applied once each; the toast marker is re-emitted so ordering is preserved."""
    help_html = open(os.path.join(HERE, "help.html"), encoding="utf-8").read()
    return [
        (TOAST, help_html + NL + "    " + TOAST),
        ('<button onclick="toggleCoaModal()" class="icon-btn"', _help_link("help-accounts", "Help with accounts", "toggleCoaModal()")),
        ('<button onclick="toggleQboExportModal()" class="icon-btn"', _help_link("help-export", "Help with exporting", "toggleQboExportModal()")),
        ('<button onclick="closeCameraCapture()" class="icon-btn"', _help_link("help-camera", "Help with the camera", "closeCameraCapture()")),
    ]


HEADER_HELP_BUTTON = (NL + '                <button onclick="openHelp()" class="btn btn-ghost" title="Open the manual (? or F1)">'
                      '<i data-lucide="circle-help" style="width:15px;height:15px"></i><span>Help</span></button>')


def add_header_button(out):
    out, n = re.subn(r"(Ollama VLM\s*</button>\s*</div>)", lambda m: m.group(1) + HEADER_HELP_BUTTON, out, count=1)
    assert n == 1, "header help button anchor not found"
    return out
