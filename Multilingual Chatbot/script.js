document.getElementById("sendBtn").addEventListener("click", async () => {
    const inputValue = document.getElementById("chatInput").value;
  
    try {
      const response = await fetch("http://localhost:3001/run-flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputValue: inputValue,
          inputType: "chat",
          outputType: "chat",
          stream: false,
        }),
      });
  
      if (response.ok) {
        const data = await response.json();
        const message =
          data?.data?.outputs[0]?.outputs[0]?.results?.message?.text ||
          "No response received.";
        document.getElementById("response").innerText = message;
      } else {
        const errorData = await response.json();
        document.getElementById("response").innerText =
          "Error: " + (errorData?.error || "Unknown error");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      document.getElementById("response").innerText =
        "Fetch Error: " + error.message;
    }
  });
  const message = response.data.outputs[0].outputs[0].results.message.data.text;

// Display only the message (clean UI)
document.getElementById('chatbox').innerHTML = message;