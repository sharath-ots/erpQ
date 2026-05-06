import useSWR from 'swr';
import { fetcher } from '../axios/axiosFetcher'; // Using the template's default fetcher

export function useZohoWorkdrive() {
  // This calls the local Next.js API route we just created in Step 1
  const { data, error, isLoading, mutate } = useSWR('/api/zoho/workdrive', fetcher);

  // Zoho typically returns an array of records in data.data
  return {
    files: data?.data || [],
    isLoading,
    isError: error,
    mutate,
  };
}