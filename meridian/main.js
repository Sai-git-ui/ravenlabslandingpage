(function () {
  var burger = document.querySelector(".nav__burger");
  var menu = document.getElementById("mobile-menu");
  if (!burger || !menu) return;

  function setOpen(open) {
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.hidden = !open;
  }

  burger.addEventListener("click", function () {
    setOpen(menu.hidden);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !menu.hidden) setOpen(false);
  });

  menu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      setOpen(false);
    });
  });
})();
