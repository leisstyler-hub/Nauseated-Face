import { cache } from 'react';
import { cookies } from 'next/headers';
import { getStates } from './locations';
import { resolveHomeArea } from '../../backend/home-area.mjs';
export const getHomeArea = cache(async () => resolveHomeArea(await getStates(), (await cookies()).get('nf-area')?.value));
