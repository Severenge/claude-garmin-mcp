import { unzipSync } from "fflate";
import { Decoder, Stream } from "@garmin/fitsdk";
import type { Env } from "./env";
import { garminGetBinary, GarminError } from "./garmin";

export async function decodeActivityFit(
  env: Env,
  activityId: string | number
) {
  const binary = await garminGetBinary(env, activityId);

  const files = unzipSync(new Uint8Array(binary));

  const fitFiles = Object.keys(files).filter(
    name => name.toLowerCase().endsWith(".fit")
  );

  if (fitFiles.length !== 1) {
    throw new GarminError(
      502,
      "Expected exactly one FIT activity file"
    );
  }

  const fitData = files[fitFiles[0]];

  const stream = Stream.fromArrayBuffer(
    new Uint8Array(fitData).buffer
  );

  const decoder = new Decoder(stream);
  const { messages, errors } = decoder.read();

  if (errors.length > 0) {
    throw new GarminError(
      502,
      `FIT decoding failed: ${errors.length} errors`
    );
  }

  return {
    activityId: String(activityId),
    lapCount: messages.lapMesgs?.length ?? 0,
    recordCount: messages.recordMesgs?.length ?? 0,
    laps: messages.lapMesgs ?? [],
    splits: messages.splitMesgs ?? [],
    records: messages.recordMesgs ?? []
  };
}