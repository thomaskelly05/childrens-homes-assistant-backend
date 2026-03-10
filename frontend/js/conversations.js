const list = document.getElementById("conversation-list");

let conversations = JSON.parse(
  localStorage.getItem("conversations") || "[]"
);


export function addConversation(title, id) {

  conversations.push({
    title: title,
    id: id
  });

  localStorage.setItem(
    "conversations",
    JSON.stringify(conversations)
  );

  renderConversations();

}


export function renderConversations() {

  list.innerHTML = "";

  conversations.forEach(conv => {

    const div = document.createElement("div");

    div.className = "conversation-item";

    div.innerText = conv.title;

    div.onclick = () => {

      localStorage.setItem("session_id", conv.id);

      location.reload();

    };

    list.appendChild(div);

  });

}


renderConversations();
