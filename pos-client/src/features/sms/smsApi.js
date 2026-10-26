import { api } from '../../app/baseApi';

export const smsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getSmsConfig: builder.query({
      query: () => '/sms/config',
      providesTags: ['SmsConfig'],
    }),
    saveSmsConfig: builder.mutation({
      query: (body) => ({ url: '/sms/config', method: 'POST', body }),
      invalidatesTags: ['SmsConfig'],
    }),
    testSms: builder.mutation({
      query: (body) => ({ url: '/sms/test', method: 'POST', body }),
    }),
    sendSmsReceipt: builder.mutation({
      query: (body) => ({ url: '/sms/send-receipt', method: 'POST', body }),
      invalidatesTags: ['SmsLogs'],
    }),
    getSmsLogs: builder.query({
      query: (page = 1) => `/sms/logs?page=${page}`,
      providesTags: ['SmsLogs'],
    }),
    getCustomersWithPhone: builder.query({
      query: () => '/sms/customers-with-phone',
    }),
    sendBulkSms: builder.mutation({
      query: (body) => ({ url: '/sms/bulk', method: 'POST', body }),
      invalidatesTags: ['SmsLogs'],
    }),
    getAccountStatus: builder.query({
      query: () => '/sms/account-status',
      keepUnusedDataFor: 60,
    }),
    reloadCredit: builder.mutation({
      query: (body) => ({ url: '/sms/reload-credit', method: 'POST', body }),
    }),
  }),
});

export const {
  useGetSmsConfigQuery,
  useSaveSmsConfigMutation,
  useTestSmsMutation,
  useSendSmsReceiptMutation,
  useGetSmsLogsQuery,
  useGetCustomersWithPhoneQuery,
  useSendBulkSmsMutation,
  useGetAccountStatusQuery,
  useReloadCreditMutation,
} = smsApi;
