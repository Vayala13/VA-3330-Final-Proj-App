// Shows "N of MAX characters" under any field marked with data-char-counter and a maxlength.
document.querySelectorAll("[data-char-counter]").forEach((field) => {
  const max = Number(field.getAttribute("maxlength"));
  const counter = document.createElement("p");
  counter.className = "char-counter";
  counter.setAttribute("aria-live", "polite");
  field.insertAdjacentElement("afterend", counter);

  const update = () => {
    counter.textContent = `${field.value.length} of ${max} characters`;
    counter.classList.toggle("char-counter-near", field.value.length >= max * 0.9);
  };
  field.addEventListener("input", update);
  update();
});
