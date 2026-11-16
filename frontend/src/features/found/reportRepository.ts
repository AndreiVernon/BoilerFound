import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FoundReport } from './model';

export const reportRepository = {
  async save(report: FoundReport): Promise<void> {
    await AsyncStorage.setItem(`boilerfound:found:${report.id}`, JSON.stringify(report));
  },
  async get(id: string): Promise<FoundReport | null> {
    const value = await AsyncStorage.getItem(`boilerfound:found:${id}`);
    return value ? JSON.parse(value) as FoundReport : null;
  },
};
