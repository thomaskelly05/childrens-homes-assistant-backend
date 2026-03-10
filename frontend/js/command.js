const palette = document.getElementById("command-palette");
const input = document.getElementById("command-input");
const results = document.getElementById("command-results");

const commands = [

  {
    name: "New Reflection",
    action: () => {
      location.reload();
    }
  },

  {
    name: "Open Supervision",
    action: () => {
      alert("Supervision view coming soon");
    }
  },

  {
    name: "Search Conversations",
    action: () => {
      input.placeholder = "Search reflections...";
    }
  },

  {
    name: "Create Template",
    action: () => {
      alert("Template generator");
    }
  },

  {
    name: "Open Guidance",
    action: () => {
      alert("Guidance search");
    }
  }

];


function renderCommands(list) {

  results.innerHTML = "";

  list.forEach(cmd => {

    const div = document.createElement("div");

    div.className = "command-item";

    div.innerText = cmd.name;

    div.onclick = () => {

      cmd.action();

      closePalette();

    };

    results.appendChild(div);

  });

}


function openPalette() {

  palette.classList.remove("hidden");

  input.focus();

  renderCommands(commands);

}


function closePalette() {

  palette.classList.add("hidden");

  input.value = "";

}


document.addEventListener("keydown", e => {

  if ((e.metaKey || e.ctrlKey) && e.key === "k") {

    e.preventDefault();

    openPalette();

  }

  if (e.key === "Escape") {

    closePalette();

  }

});


input.addEventListener("input", () => {

  const q = input.value.toLowerCase();

  const filtered = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(q)
  );

  renderCommands(filtered);

});
