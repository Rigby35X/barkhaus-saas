// Only website footer fields marked visible are public. Never fall back to private org profiles.
export async function publishedContact(orgId, env, fetcher = fetch) {
  const query = new URLSearchParams({select:'footer_email,footer_phone,footer_address_line_one,footer_address_city,footer_address_state,footer_address_zip,footer_ein',
    org_id:`eq.${orgId}`,page_slug:'eq.global',section_key:'eq.footer',limit:'1'});
  const response = await fetcher(`${env.url}/rest/v1/public_website_content?${query}`,{
    headers:{apikey:env.key,Authorization:`Bearer ${env.key}`}});
  if (!response.ok) throw new Error('Could not load published contact information.');
  const rows = await response.json();
  const footer = rows[0] ?? {};
  return {email:footer.footer_email ?? '',contact_email:footer.footer_email ?? '',phone:footer.footer_phone ?? '',
    address:footer.footer_address_line_one ?? '',city:footer.footer_address_city ?? '',state:footer.footer_address_state ?? '',
    zip_code:footer.footer_address_zip ?? '',ein:footer.footer_ein ?? ''};
}
