select count(*) as incident_count
from public.work_items
where type = 'INCIDENT';