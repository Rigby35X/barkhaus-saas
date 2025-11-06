agent "Agent Bark" {
  canonical = "301FbDW0"
  llm = {
    type         : "anthropic"
    system_prompt: "You are a helpful AI Agent that completes tasks accurately. When you need additional information to complete a task, use the available tools. Always explain your reasoning and provide clear responses."
    max_steps    : 5
    prompt       : ""
    api_key      : ""
    model        : "claude-4-sonnet-20250514"
    temperature  : 1
    reasoning    : true
    baseURL      : ""
    headers      : ""
  }

  tools = []
}