export interface SynthesisInput {
  apiKey: string
  voiceId: string
  modelId: string
  text: string
  outputFormat: string
}

export interface SynthesisResult {
  audio: Uint8Array
  characters: string[]
  starts: number[]
  ends: number[]
}

interface AlignmentPayload {
  characters: string[]
  character_start_times_seconds: number[]
  character_end_times_seconds: number[]
}

interface TimestampsResponse {
  audio_base64: string
  alignment?: AlignmentPayload | null
  normalized_alignment?: AlignmentPayload | null
}

/**
 * Call ElevenLabs text to speech with timestamps (server only; the key never
 * ships to the browser). Endpoint and response shape per the ElevenLabs docs:
 * POST /v1/text-to-speech/{voice_id}/with-timestamps
 */
export async function synthesize(input: SynthesisInput): Promise<SynthesisResult> {
  const url =
    `https://api.elevenlabs.io/v1/text-to-speech/${input.voiceId}/with-timestamps` +
    `?output_format=${encodeURIComponent(input.outputFormat)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': input.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: input.text, model_id: input.modelId })
  })

  if (!response.ok) {
    throw new Error(`ElevenLabs request failed (${response.status}): ${await response.text()}`)
  }

  const data = (await response.json()) as TimestampsResponse
  const alignment = data.alignment ?? data.normalized_alignment
  if (!alignment) throw new Error('ElevenLabs returned no alignment data')

  return {
    audio: new Uint8Array(Buffer.from(data.audio_base64, 'base64')),
    characters: alignment.characters,
    starts: alignment.character_start_times_seconds,
    ends: alignment.character_end_times_seconds
  }
}
