const tokenRecord = await getTokensFromDB(tenantId);
const decryptedRefresh = decrypt(tokenRecord.refresh_token);
oAuth2Client.setCredentials({ refresh_token: decryptedRefresh });
