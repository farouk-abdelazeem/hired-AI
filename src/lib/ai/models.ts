export const DEFAULT_AI_MODEL = "gemini-2.5-flash";

export const AI_MODELS = [
    // Gemini 3.x family
    {
        id: "gemini-3.5-flash",
        label: "Gemini 3.5 Flash",
        description: "Most intelligent for agentic & coding tasks",
    },
    {
        id: "gemini-3.1-pro-preview",
        label: "Gemini 3.1 Pro (Preview)",
        description: "Advanced reasoning & problem-solving",
    },
    {
        id: "gemini-3-flash-preview",
        label: "Gemini 3 Flash (Preview)",
        description: "Frontier-class at a fraction of the cost",
    },
    {
        id: "gemini-3.1-flash-lite",
        label: "Gemini 3.1 Flash-Lite",
        description: "Fast and cost-efficient",
    },
    // Gemini 2.5 family
    {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        description: "Balanced speed and quality",
    },
    {
        id: "gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
        description: "Deep reasoning and coding",
    },
    {
        id: "gemini-2.5-flash-lite",
        label: "Gemini 2.5 Flash-Lite",
        description: "Fastest and lowest cost (2.5)",
    },
    // Gemini 2.0 family
    {
        id: "gemini-2.0-flash",
        label: "Gemini 2.0 Flash",
        description: "Stable previous-gen model",
    },
    {
        id: "gemini-2.0-flash-lite",
        label: "Gemini 2.0 Flash-Lite",
        description: "Budget-friendly previous-gen",
    },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]["id"];

export function resolveAiModel(model: unknown): AiModelId {
    return AI_MODELS.some((option) => option.id === model)
        ? (model as AiModelId)
        : DEFAULT_AI_MODEL;
}
