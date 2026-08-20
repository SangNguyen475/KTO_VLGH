class ModalManager {
  constructor(layer) {
    this.layer = layer;
    this.current = null;
    this.previousFocus = null;
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  open({ title, eyebrow = "Hành Trình Ngũ Nhạc", content, closeable = true, onClose = null }) {
    if (this.current) this.close("replace");
    this.previousFocus = document.activeElement;

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const dialog = document.createElement("section");
    dialog.className = "scroll-modal";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "modal-title");

    if (closeable) {
      const closeButton = document.createElement("button");
      closeButton.className = "seal-close scroll-modal__close";
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", "Đóng cửa sổ");
      closeButton.textContent = "×";
      closeButton.addEventListener("click", () => this.close("button"));
      dialog.append(closeButton);
    }

    const header = document.createElement("header");
    header.className = "scroll-modal__header";
    const eyebrowNode = document.createElement("small");
    eyebrowNode.textContent = eyebrow;
    const titleNode = document.createElement("h2");
    titleNode.id = "modal-title";
    titleNode.textContent = title;
    header.append(eyebrowNode, titleNode);

    const body = document.createElement("div");
    body.className = "scroll-modal__body";
    if (content instanceof Node) body.append(content);
    else body.textContent = String(content || "");

    dialog.append(header, body);
    backdrop.append(dialog);
    this.layer.append(backdrop);
    this.current = { backdrop, dialog, closeable, onClose };
    document.addEventListener("keydown", this.handleKeydown);

    requestAnimationFrame(() => {
      const focusTarget = dialog.querySelector("button:not([disabled]), [href], input, [tabindex='0']");
      (focusTarget || dialog).focus();
    });

    return dialog;
  }

  handleKeydown(event) {
    if (!this.current) return;
    if (event.key === "Escape" && this.current.closeable) {
      event.preventDefault();
      this.close("escape");
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = [...this.current.dialog.querySelectorAll(
      "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
    )];
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  close(reason = "programmatic") {
    if (!this.current) return;
    const { backdrop, onClose } = this.current;
    this.current = null;
    document.removeEventListener("keydown", this.handleKeydown);
    backdrop.remove();
    if (typeof onClose === "function") onClose(reason);
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
  }

  confirm({ title, message, confirmLabel = "Xác Nhận", cancelLabel = "Hủy" }) {
    return new Promise((resolve) => {
      const content = document.createElement("div");
      const text = document.createElement("p");
      text.textContent = message;
      const actions = document.createElement("div");
      actions.className = "modal-actions";
      const cancel = document.createElement("button");
      cancel.className = "wood-button";
      cancel.type = "button";
      cancel.textContent = cancelLabel;
      const confirm = document.createElement("button");
      confirm.className = "seal-button";
      confirm.type = "button";
      confirm.textContent = confirmLabel;
      actions.append(cancel, confirm);
      content.append(text, actions);

      let settled = false;
      const settle = (value) => {
        if (settled) return;
        settled = true;
        this.close("choice");
        resolve(value);
      };
      cancel.addEventListener("click", () => settle(false));
      confirm.addEventListener("click", () => settle(true));
      this.open({ title, content, onClose: () => settle(false) });
    });
  }
}

export const createModalManager = (layer) => new ModalManager(layer);
