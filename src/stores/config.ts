import { commands } from "@/bindings.gen";
import z from "zod";
import DEFAULT_CONFIG_JSON_URL from "../public/default_config.json?url";

const ConfigV1Schema = z.object({
  version: z.literal(1),
  copyOnUpload: z.boolean().default(true),
  uploaderApiKey: z.string().optional(),
  uploaderUrlBase: z.string(),
  feature: z.record(z.string(), z.boolean()),
  vrchatApiKey: z.string().or(z.null()).optional(),
});

const VersionedConfigSchema = z.union([ConfigV1Schema]);

const LatestConfigSchema = ConfigV1Schema;

export type Config = z.infer<typeof LatestConfigSchema>;

export async function migrateConfig(
  oldConfig: z.infer<typeof VersionedConfigSchema>,
): Promise<Config> {
  // TODO: Implement migration logic when there are multiple versions
  return oldConfig;
}

export async function loadConfig(): Promise<Config> {
  const loadConfigFileResult = await commands.loadConfigFile();

  if (loadConfigFileResult.status === "error") {
    if (loadConfigFileResult.error.type === "ConfigExistance") {
      return LatestConfigSchema.parse(
        await fetch(DEFAULT_CONFIG_JSON_URL).then((res) => res.json()),
      );
    }
    throw new Error(
      `設定ファイルの読み込みに失敗しました: ${loadConfigFileResult.error}`,
    );
  }

  const versionedConfig = await VersionedConfigSchema.parseAsync(
    JSON.parse(loadConfigFileResult.data),
  );

  const config = migrateConfig(versionedConfig);

  return config;
}

export async function saveConfig(config: Config): Promise<void> {
  const saveConfigFileResult = await commands.saveConfigFile(
    JSON.stringify(config, null, 2),
  );
  if (saveConfigFileResult.status === "error") {
    throw new Error(
      `設定ファイルの保存に失敗しました: ${saveConfigFileResult.error}`,
    );
  }
}
