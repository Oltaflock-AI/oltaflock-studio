// Server instructions (sent to the client on connect) and reusable prompts.

import type { McpServer } from 'npm:@modelcontextprotocol/sdk@1.31.0/server/mcp.js';
import { z } from 'npm:zod@3.25.76';

export const INSTRUCTIONS = `Oltaflock Studio generates images and videos with top models (Veo, Kling, Seedance, Sora, Runway, Flux, Imagen, GPT Image and more) and keeps everything in the user's library.

How to work:
1. At the start of a creative task, call studio_list_memories and apply what you find (style, brands, dislikes, technical defaults) unless the user says otherwise. Check studio_list_elements for saved characters/products the request mentions.
2. Pick models with studio_list_models, then studio_get_model for exact setting keys before studio_generate. Tell the user the credit cost for anything expensive (studio_estimate_cost) before running batches.
3. studio_generate returns an id immediately. Videos take 1–5 minutes: start every shot first, then call studio_get_generations with all ids and wait_seconds=50, repeating until done. Show output_url links when finished.
4. When the user states a lasting preference or fact ("our brand colour is…", "never use lens flare"), save it with studio_remember. Don't save one-off requests.
5. For a multi-shot video, keep subjects consistent: generate a keyframe/character image first, save it with studio_save_element, and reference it as @Name in every shot (use image-to-video models with the keyframe as reference_images). File all shots in one folder (studio_create_folder).
6. Files the user attaches in chat must be uploaded with studio_upload_media first to get a URL the models can read.
7. Interactive panels (shown in chat clients that support them): results of studio_generate / studio_get_generations already render as cards with star, rename, folder, download, regenerate and quick actions. Open studio_open_studio when the user wants to tweak settings or browse models themselves, studio_browse_library to let them pick from their library, studio_storyboard for any plan of 2+ shots (instead of a text shot list), and studio_open_memory when they want to see or edit what you remember. Requests made from a panel arrive as user messages; follow them like any other request.`;

export function registerPrompts(server: McpServer) {
  server.registerPrompt('direct_video', {
    title: 'Direct a video',
    description: 'Plan and produce a multi-shot video from a brief: shot list, keyframes, clips, all filed in one folder.',
    argsSchema: {
      brief: z.string().describe('What the video is for and what should happen'),
      length_seconds: z.string().optional().describe('Target total length, e.g. "30"'),
      aspect_ratio: z.string().optional().describe('e.g. 16:9, 9:16, 1:1'),
    },
  }, ({ brief, length_seconds, aspect_ratio }: { brief: string; length_seconds?: string; aspect_ratio?: string }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Direct a video in Oltaflock Studio.

Brief: ${brief}
${length_seconds ? `Target length: ~${length_seconds}s\n` : ''}${aspect_ratio ? `Aspect ratio: ${aspect_ratio}\n` : ''}
Steps:
1. Read my memory (studio_list_memories) and elements (studio_list_elements).
2. Write a shot list: for each shot give duration, camera, action and the model you'd use. Show it with the total credit estimate and wait for my OK.
3. Create a folder for the project.
4. Generate a keyframe image for each shot (or a character/product element first if one is needed across shots), show them, and let me swap any.
5. Animate each keyframe with an image-to-video model, starting all shots before waiting on them.
6. Give me the finished clips in order with their links, and save anything you learned about my taste to memory.`,
      },
    }],
  }));
}
