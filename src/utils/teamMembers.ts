import { getBackendSrv, getDataSourceSrv } from '@grafana/runtime';
import { SceneDataTransformer, SceneQueryRunner } from '@grafana/scenes';
import { MappingType, ValueMapping } from '@grafana/data';
import { PLUGIN_ID, METRICS, LABELS } from '../constants';
import { ClaudeStatsSettings, parseTeamMembers } from '../types';

let cachedTeamMembers: Record<string, string> | null = null;

/**
 * Load team member mappings from plugin settings
 * Parses the teamMembers string (UUID|Name format) into a dictionary
 */
export async function loadTeamMembers(): Promise<Record<string, string>> {
  if (cachedTeamMembers !== null) {
    return cachedTeamMembers;
  }

  try {
    const response = await getBackendSrv().get(`/api/plugins/${PLUGIN_ID}/settings`);
    const jsonData = response.jsonData as ClaudeStatsSettings | undefined;
    cachedTeamMembers = parseTeamMembers(jsonData?.teamMembers || '');
    return cachedTeamMembers;
  } catch (e) {
    console.error('Error loading team member settings:', e);
    cachedTeamMembers = {};
    return cachedTeamMembers;
  }
}

/**
 * Clear the cached team members (useful after saving new settings)
 */
export function clearTeamMembersCache(): void {
  cachedTeamMembers = null;
}

/**
 * Discover unique user_account_uuid values from Prometheus
 */
export async function discoverTeamMemberUuids(): Promise<string[]> {
  try {
    // Get the first Prometheus data source
    const dsList = await getDataSourceSrv().getList({ type: 'prometheus' });
    if (dsList.length === 0) {
      return [];
    }

    const dsUid = dsList[0].uid;

    // Query for unique user_account_uuid values
    const response = await getBackendSrv().post(`/api/ds/query`, {
      queries: [
        {
          refId: 'A',
          datasource: { type: 'prometheus', uid: dsUid },
          expr: `group by (${LABELS.USER_ACCOUNT_UUID}) (${METRICS.COST_USAGE})`,
          instant: true,
        },
      ],
      from: 'now-30d',
      to: 'now',
    });

    // Extract unique UUIDs from the response
    const uuids: string[] = [];
    const frames = response?.results?.A?.frames || [];
    for (const frame of frames) {
      const labels = frame?.schema?.fields?.[1]?.labels;
      if (labels?.user_account_uuid) {
        uuids.push(labels.user_account_uuid);
      }
    }

    return uuids;
  } catch (e) {
    console.error('Error discovering team member UUIDs:', e);
    return [];
  }
}

/**
 * Get team member display name from UUID
 * Returns the UUID if no mapping is found
 */
export function getTeamMemberName(uuid: string, mappings: Record<string, string>): string {
  return mappings[uuid] || uuid;
}

/**
 * Create rename transformations for team member UUIDs
 * This creates a series of renameByRegex transformations
 */
export function createTeamMemberRenameTransformations(mappings: Record<string, string>): Array<{
  id: string;
  options: { regex: string; renamePattern: string };
}> {
  return Object.entries(mappings).map(([uuid, name]) => ({
    id: 'renameByRegex',
    options: {
      regex: `(.*)${escapeRegex(uuid)}(.*)`,
      renamePattern: `$1${name}$2`,
    },
  }));
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create value mappings for table panels
 * Maps UUID values to display names
 */
export function createTeamMemberValueMappings(mappings: Record<string, string>): ValueMapping[] {
  const options: Record<string, { text: string; index: number }> = {};
  let index = 0;
  for (const [uuid, name] of Object.entries(mappings)) {
    options[uuid] = { text: name, index: index++ };
  }
  return [{ type: MappingType.ValueToText, options }];
}

/**
 * Wrap a SceneQueryRunner with transformations to rename team member UUIDs
 */
export function withTeamMemberNames(
  queryRunner: SceneQueryRunner,
  teamMembers: Record<string, string>
): SceneDataTransformer {
  const transformations = createTeamMemberRenameTransformations(teamMembers);

  return new SceneDataTransformer({
    $data: queryRunner,
    transformations: transformations,
  });
}
