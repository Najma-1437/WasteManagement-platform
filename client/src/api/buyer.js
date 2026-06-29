import axios from './axiosClient';

export const getMyOffers = () => axios.get('/buyer/offers');
export const createOffer = (payload) => axios.post('/buyer/offers', payload);
export const updateOffer = (offerId, payload) => axios.patch(`/buyer/offers/${offerId}`, payload);
export const deleteOffer = (offerId) => axios.delete(`/buyer/offers/${offerId}`);
export const getMatches = () => axios.get('/buyer/matches');
export const getMyTransactions = () => axios.get('/buyer/transactions');
export const confirmMatch = (logId, offerId) =>
  axios.patch(`/buyer/matches/${logId}/confirm`, { offer_id: offerId });

export const initiatePayment = (transactionId, phoneNumber) =>
  axios.post(`/buyer/transactions/${transactionId}/pay`, { phone_number: phoneNumber });

export const confirmReceipt = (transactionId) =>
  axios.patch(`/buyer/transactions/${transactionId}/confirm-receipt`);