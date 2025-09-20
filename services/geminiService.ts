import { GoogleGenAI, Type } from "@google/genai";
import { DocumentType, type GeneratedDocument, StoredDocument } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const docSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "The main title of the technical document."
        },
        docType: {
          type: Type.STRING,
          enum: ["High-Level Design", "Low-Level Design", "Technical Design Document"],
          description: "The type of the document."
        },
        sections: {
            type: Type.ARRAY,
            description: "An array of sections that make up the document.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING,
                        description: "The title of this section."
                    },
                    content: {
                        type: Type.STRING,
                        description: "The content of this section, formatted in Markdown. Include lists, bold text, and code blocks where appropriate. Also generate at least one Mermaid diagram within a markdown code block."
                    }
                },
                required: ['title', 'content']
            }
        }
    },
    required: ['title', 'docType', 'sections']
};

export async function generateDocument(
  userInput: string, 
  docType: DocumentType, 
  context: string | null
): Promise<GeneratedDocument> {
  
  let contextPrompt = '';
  if (context) {
    contextPrompt = `
      Please use the following document(s) as additional context. The content may be from multiple files, each delineated by '--- START OF FILE: ... ---' and '--- END OF FILE: ... ---'. Ground your response in the information provided here:
      ---
      CONTEXT:
      ${context}
      ---
    `;
  }

  const prompt = `
    You are TechDocAI, an intelligent multi-agent AI platform. Your purpose is to generate professional technical documentation. You will act as a team of expert AI agents, including a Chief Solution Architect, Cloud Architect, Security Architect, and others, to produce a comprehensive and high-quality document.

    Based on the user's request below, generate a ${docType} (${Object.keys(DocumentType)[Object.values(DocumentType).indexOf(docType)]}) document.
    ${contextPrompt}
    The document should be well-structured, professional, and follow best practices for technical design documents. The content should be detailed and accurate.
    
    Structure the output into logical sections (e.g., Introduction, System Architecture, Components, Data Flow, Security Considerations, Deployment, etc.).

    Writing Style: The entire document must be written in a natural, human-like, and narrative style, similar to a well-written technical book. Avoid using simple bullet points for explanations. Instead, explain concepts with detailed, flowing paragraphs and well-structured sentences. Use a storytelling approach to guide the reader through complex topics, ensuring the explanations are clear, comprehensive, and engaging. The tone should be professional yet accessible.

    For diagrams, use Mermaid.js syntax inside a markdown code block (e.g., \`\`\`mermaid\ngraph TD; ...\`\`\`). Generate at least one architecture diagram.

    USER REQUEST: "${userInput}"

    Generate the response in the specified JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: docSchema
        }
    });
    
    const jsonString = response.text;
    if (!jsonString || !jsonString.trim().startsWith('{')) {
        throw new Error("Received an empty or invalid response from the AI. Please try again.");
    }

    let parsedJson;
    try {
        parsedJson = JSON.parse(jsonString);
    } catch (parseError) {
        console.error("Failed to parse JSON response from AI:", jsonString);
        throw new Error("The AI returned a malformed response. Please try refining your prompt.");
    }

    // Basic validation
    if (!parsedJson.title || !Array.isArray(parsedJson.sections) || !parsedJson.docType) {
      throw new Error("The AI response was missing required fields (title, sections, or docType).");
    }

    return parsedJson as GeneratedDocument;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Re-throw a more user-friendly error. If it's already one of our custom errors, just re-throw it.
    if (error instanceof Error && (error.message.startsWith("Received an empty") || error.message.startsWith("The AI returned"))) {
        throw error;
    }
    throw new Error("Failed to generate document from AI service. Please check your API key, network connection, and prompt complexity.");
  }
}

export async function modifyDocumentWithAgents(
  currentDocument: StoredDocument,
  userRequest: string
): Promise<GeneratedDocument> {
    
    // FIX: The document's properties like title, docType, and sections are on the latest version, not on the StoredDocument object itself.
    const latestVersion = currentDocument.versions[currentDocument.versions.length - 1];
    if (!latestVersion) {
      throw new Error("Cannot modify a document with no versions.");
    }

    const currentDocumentJson = JSON.stringify({
        title: latestVersion.title,
        docType: latestVersion.docType,
        sections: latestVersion.sections.map(({ comments, ...rest }) => rest) // Strip comments for brevity
    });

    const prompt = `
      You are an agentic AI assistant for TechDocAI. Your task is to modify an existing technical document based on a user's request. You must simulate a multi-agent workflow to achieve this.

      WORKFLOW:
      1.  **Analysis Agent:** Analyze the user's request to understand the required modifications.
      2.  **Research Agent:** If the request requires new information (e.g., "add latest security practices"), use your internal knowledge to gather it.
      3.  **Modification Agent:** Apply the changes to the provided JSON structure of the document. This might involve adding, removing, or rewriting sections. Ensure the entire document remains coherent.

      Writing Style: All new or modified content must adhere to a natural, human-like, and narrative style, similar to a well-written technical book. Avoid using simple bullet points for explanations; instead, use detailed, flowing paragraphs. Use a storytelling approach. The entire document, after your modifications, must be coherent and maintain this professional, engaging, and accessible tone.

      USER REQUEST: "${userRequest}"

      CURRENT DOCUMENT:
      \`\`\`json
      ${currentDocumentJson}
      \`\`\`

      Based on this workflow, provide the COMPLETE and UPDATED document structure as a valid JSON object. The output MUST conform to the provided JSON schema. Do not output anything else besides the final JSON object.
    `;

    try {
      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
              responseMimeType: "application/json",
              responseSchema: docSchema
          }
      });
      
      const jsonString = response.text;
      if (!jsonString || !jsonString.trim().startsWith('{')) {
          throw new Error("Received an empty or invalid response from the AI. Please try again.");
      }

      let parsedJson;
      try {
          parsedJson = JSON.parse(jsonString);
      } catch (parseError) {
          console.error("Failed to parse JSON response from AI:", jsonString);
          throw new Error("The AI returned a malformed response. Please try refining your prompt.");
      }
      
      if (!parsedJson.title || !Array.isArray(parsedJson.sections) || !parsedJson.docType) {
        throw new Error("The AI response was missing required fields (title, sections, or docType).");
      }

      return parsedJson as GeneratedDocument;

    } catch (error) {
      console.error("Error calling Gemini API for document modification:", error);
      if (error instanceof Error && (error.message.startsWith("Received an empty") || error.message.startsWith("The AI returned"))) {
          throw error;
      }
      throw new Error("Failed to modify the document via the AI service. The model may have been unable to fulfill the request.");
    }
}