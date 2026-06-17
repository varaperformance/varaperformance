import type {
  InjectionRoute,
  InjectionSite,
} from '../schemas/injection.schema';

export interface InjectionProtocolResponse {
  id: string;
  name: string;
  defaultDose: string | null;
  unit: string | null;
  route: InjectionRoute | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InjectionLogResponse {
  id: string;
  protocolId: string | null;
  name: string;
  dose: string | null;
  unit: string | null;
  route: InjectionRoute | null;
  site: InjectionSite | null;
  notes: string | null;
  loggedAt: string;
  createdAt: string;
}

export interface InjectionLogsListData {
  items: InjectionLogResponse[];
  total: number;
  limit: number;
}
