const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

let allProducts = [];
let selectedProducts = [];

productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

function displayProducts(products) {
  productsContainer.innerHTML = products.map(product => `
    <div class="product-card" data-name="${product.name}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", () => {
      const name = card.dataset.name;
      const alreadySelected = selectedProducts.some(p => p.name === name);
      if (!alreadySelected) {
        const product = allProducts.find(p => p.name === name);
        selectedProducts.push(product);

        const div = document.createElement("div");
        div.textContent = name;
        selectedProductsList.appendChild(div);

        card.classList.add("selected");
      }
    });
  });
}

categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const filtered = products.filter(p => p.category === e.target.value);
  displayProducts(filtered);
});

function addMessage(sender, text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = sender;

  let html = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // bold markdown
    .replace(/\n\s*\d+\.\s/g, "<br><br>$&")            // new lines before steps
    .replace(/\n/g, "<br>");                           // other line breaks

  if (html.match(/\d+\.\s/)) {
    // Extract lines starting with numbers into <li> elements
    html = html.replace(/<br><br>(\d+\.\s.*?)(?=(<br><br>\d+\.\s|\s*$))/gs, (_, content) => {
      // Optional cleanup: strip duplicate step numbers inside the content
      const stepParts = content.split(":");
      const title = stepParts[0].replace(/^\d+\.\s*/, "").trim();
      const rest = stepParts.slice(1).join(":").trim();
      return `<li><strong>${title}:</strong> ${rest}</li>`;
    });
    html = `<ol>${html}</ol>`;
  }

  messageDiv.innerHTML = html;
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function getOpenAIResponse(userMessage) {
  addMessage("user", userMessage);
  addMessage("assistant", "Thinking...");

  try {
    const res = await fetch("https://loreal-worker.anthonythan2001.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a friendly L'Oréal skincare advisor. Only suggest routines using selected L'Oréal products. Respond in clear steps. Format bold headings and use numbered lists when needed."
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      })
    });

    const data = await res.json();
    chatWindow.removeChild(chatWindow.lastChild);

    if (data.reply) {
      addMessage("assistant", data.reply);
    } else {
      addMessage("assistant", "⚠️ Unexpected response format.");
      console.error("Missing 'reply' in response:", data);
    }
  } catch (err) {
    chatWindow.removeChild(chatWindow.lastChild);
    addMessage("assistant", "❌ Error reaching assistant.");
    console.error("Chat fetch error:", err);
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = document.getElementById("userInput").value.trim();
  if (message) {
    getOpenAIResponse(message);
    document.getElementById("userInput").value = "";
  }
});

generateRoutineBtn.addEventListener("click", () => {
  if (selectedProducts.length === 0) {
    addMessage("system", "Please select some products first.");
    return;
  }

  const formattedList = selectedProducts.map(p => `${p.name} (${p.category})`).join(", ");
  const prompt = `Create a skincare routine using the following L'Oréal products: ${formattedList}`;
  getOpenAIResponse(prompt);
});
