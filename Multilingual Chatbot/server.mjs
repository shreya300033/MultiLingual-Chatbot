import express from "express";

// Dynamic import of 'node-fetch' (for ESM compatibility)
const fetch = (await import("node-fetch")).default;

class LangflowClient {
  constructor(baseURL, applicationToken) {
    this.baseURL = baseURL;
    this.applicationToken = applicationToken;
  }

  async post(endpoint, body, headers = { "Content-Type": "application/json" }) {
    headers["Authorization"] = `Bearer ${this.applicationToken}`;
    const url = `${this.baseURL}${endpoint}`;
    console.log("Making POST request to:", url, "with body:", body);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const responseMessage = await response.json();
      console.log("Response received:", responseMessage);

      if (!response.ok) {
        throw new Error(
          `${response.status} ${response.statusText} - ${JSON.stringify(
            responseMessage
          )}`
        );
      }

      return responseMessage;
    } catch (error) {
      console.error("Request Error:", error.message);
      throw error;
    }
  }

  async initiateSession(
    flowId,
    langflowId,
    inputValue,
    inputType = "chat",
    outputType = "chat",
    stream = false,
    tweaks = {}
  ) {
    const endpoint = `/lf/${langflowId}/api/v1/run/${flowId}?stream=${stream}`;
    return this.post(endpoint, {
      input_value: inputValue,
      input_type: inputType,
      output_type: outputType,
      tweaks,
    });
  }

  async runFlow(
    flowIdOrName,
    langflowId,
    inputValue,
    inputType = "chat",
    outputType = "chat",
    tweaks = {},
    stream = false,
    onUpdate,
    onClose,
    onError
  ) {
    try {
      console.log("Initiating Langflow session...");
      const initResponse = await this.initiateSession(
        flowIdOrName,
        langflowId,
        inputValue,
        inputType,
        outputType,
        stream,
        tweaks
      );

      console.log("Session initiation response:", initResponse);

      if (
        stream &&
        initResponse &&
        initResponse.outputs &&
        initResponse.outputs[0].outputs[0].artifacts.stream_url
      ) {
        const streamUrl =
          initResponse.outputs[0].outputs[0].artifacts.stream_url;
        console.log("Streaming URL:", streamUrl);
        this.handleStream(streamUrl, onUpdate, onClose, onError);
      }

      return initResponse;
    } catch (error) {
      console.error("Error running flow:", error.message);
      throw error;
    }
  }

  handleStream(streamUrl, onUpdate, onClose, onError) {
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Stream update received:", data);
      onUpdate(data);
    };

    eventSource.onerror = (event) => {
      console.error("Stream Error:", event);
      onError(event);
      eventSource.close();
    };

    eventSource.addEventListener("close", () => {
      console.log("Stream closed");
      onClose("Stream closed");
      eventSource.close();
    });

    return eventSource;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Allow CORS
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    next();
  });

  app.post("/run-flow", async (req, res) => {
    const {
      inputValue,
      inputType = "chat",
      outputType = "chat",
      stream = false,
    } = req.body;

    const flowIdOrName = "7954a6e3-b1ad-43db-96da-69799ec24bea";
    const langflowId = "5117e687-96a8-4e15-849b-f5013c5ed7f1";
    const applicationToken =
      "AstraCS:NgGpZTbPizbRjNznRbqDXzvd:4da48424e89875c6172d6177686f95287471591f39200b76ad38ad2e358e19bf";
    const langflowClient = new LangflowClient(
      "https://api.langflow.astra.datastax.com",
      applicationToken
    );

    try {
      const tweaks = {
        "ChatInput-GHsSs": {},
        "ParseData-txcSm": {},
        "Prompt-GvXZt": {},
        "SplitText-O8U3U": {},
        "ChatOutput-RVSIT": {},
        "AstraDB-tYQwk": {},
        "File-WTyWr": {},
        "GroqModel-RstYq": {},
        "NVIDIAEmbeddingsComponent-e4Avy": {},
        "AstraDB-2Lihf": {},
        "NVIDIAEmbeddingsComponent-5kFDd": {},
        "Memory-aDg28": {},
        "OpenAIModel-tNGLX": {},
        "OllamaModel-5Ov9p": {},
      };

      console.log("Received input value:", inputValue);

      const response = await langflowClient.runFlow(
        flowIdOrName,
        langflowId,
        inputValue,
        inputType,
        outputType,
        tweaks,
        stream,
        (data) => console.log("Streaming data:", data),
        (message) => console.log("Stream closed:", message),
        (error) => console.error("Stream error:", error)
      );

      console.log("Sending response to client:", response);
      res.json({ message: "Flow ran successfully", data: response });
    } catch (error) {
      console.error("Error in /run-flow:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();
