// Client-side convenience only; the server validates every field.
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const password = document.getElementById("password");
  const confirm = document.getElementById("confirm_password");
  const hint = document.getElementById("password-match");

  if (!form || !password || !confirm || !hint) {
    return;
  }

  const updateHint = () => {
    if (!confirm.value) {
      hint.hidden = true;
      return;
    }

    hint.hidden = false;
    const matches = password.value === confirm.value;
    hint.textContent = matches ? "Passwords match." : "Passwords do not match.";
    hint.classList.toggle("match", matches);
    hint.classList.toggle("mismatch", !matches);
  };

  password.addEventListener("input", updateHint);
  confirm.addEventListener("input", updateHint);
});
