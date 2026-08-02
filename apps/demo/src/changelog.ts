import {existsSync, readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

interface PackageManifest {
  name: string;
  version: string;
}

export interface PackageChangelog {
  id: 'web' | 'web-components' | 'vue';
  name: string;
  version: string;
  markdown: string;
  sourceUrl: string;
}

function findRepositoryFile(filePath: string) {
  const workingDirectory = pathToFileURL(`${process.cwd()}/`);
  const candidates = [
    new URL(`../../../${filePath}`, import.meta.url),
    new URL(`../../../../../${filePath}`, import.meta.url),
    new URL(filePath, workingDirectory),
    new URL(`../../${filePath}`, workingDirectory),
  ];
  const fileUrl = candidates.find((candidate) => existsSync(candidate));

  if (!fileUrl) throw new Error(`Could not find repository file: ${filePath}`);
  return fileUrl;
}

function readPackage(packageId: PackageChangelog['id']) {
  const packageUrl = findRepositoryFile(`packages/${packageId}/package.json`);
  const changelogUrl = findRepositoryFile(`packages/${packageId}/CHANGELOG.md`);
  const manifest = JSON.parse(readFileSync(packageUrl, 'utf8')) as PackageManifest;

  return {
    id: packageId,
    name: manifest.name,
    version: manifest.version,
    markdown: readFileSync(changelogUrl, 'utf8'),
    sourceUrl: `https://github.com/YuJM/floating-ui-plus/blob/main/packages/${packageId}/CHANGELOG.md`,
  } satisfies PackageChangelog;
}

export const packageChangelogs = (['web', 'web-components', 'vue'] as const).map(readPackage);

function firstChangeSentence(markdown: string) {
  const latestHeading = markdown.match(/^##\s+[^\n]+/m);
  const latestReleaseStart = latestHeading?.index ?? -1;
  const latestReleaseEnd = markdown.indexOf('\n## ', latestReleaseStart + 1);
  const latestRelease = latestReleaseStart < 0
    ? ''
    : markdown.slice(latestReleaseStart + (latestHeading?.[0].length ?? 0), latestReleaseEnd < 0 ? undefined : latestReleaseEnd);
  const firstBullet = latestRelease.match(/^-\s+([^\n]+(?:\n\s{2,}.*)*)/m)?.[1] ?? '';
  const summary = firstBullet
    .replace(/\s+/g, ' ')
    .replace(/^[\w-]+:\s*/, '')
    .replace(/`([^`]+)`/g, '$1')
    .trim();

  return summary.match(/^.*?[.!?](?:\s|$)/)?.[0].trim() || summary;
}

const corePackage = packageChangelogs[0];

export const latestRelease = {
  version: corePackage.version,
  summary: firstChangeSentence(corePackage.markdown),
};
