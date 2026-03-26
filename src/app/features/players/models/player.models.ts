export type PlayerRow = {
  license_uuid: string;

  hostname: string | null;
  dealer_alias: string | null;
  site_alias: string | null;
  license_type: string | null;
  screen: string | null;

  dashboard_url: string | null;

  mesh_device_id: string | null;
  mesh_url: string | null;

  tags: string[] | null;
};

export type PlayerTableRow = PlayerRow & {
  tags_display: string;
};

export type PlayerCacheState = {
  rows: PlayerRow[];
  currentPage: number;
  hasMore: boolean;
  userEmail: string;
  userId: string;
  userRole: string;
};