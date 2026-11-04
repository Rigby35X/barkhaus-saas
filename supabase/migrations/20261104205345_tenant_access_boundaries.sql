-- No private organization-profile contact/address/EIN columns are exposed.
-- Public contact details come only from explicitly visible website footer content.
-- Phase 1: safe read-only projections. Deploy compatible app consumers before phase 2.
CREATE VIEW public.public_organizations WITH (security_barrier=true) AS
SELECT id,org,slug,subdomain,custom_domain,website,
 is_active,logo_light_url,logo_dark_url,favicon_url,heading_font,body_font,primary_color,
 secondary_color,accent_color,text_color,background_color,facebook_url,instagram_url,
 mission_statement,founded_year,font_scale,heading_color,body_text_color,link_color
FROM public.organizations WHERE is_active IS TRUE;
CREATE VIEW public.public_animals WITH (security_barrier=true) AS
SELECT a.id,a.org_id,a.created_at,a.name,a.litter_name,a.species,a.breed,a.description,
 a.description_long,a.status,a.image_url,a.photo_url,a.additional_image_1,a.additional_image_2,
 a.additional_image_3,a.additional_image_4,a.age,a.gender,a.size,a.weight,a.color,a.vaccinated,
 a.spayed_neutered,a.special_needs,a.house_trained,a.energy_level,a.good_with_kids,
 a.good_with_dogs,a.good_with_cats,a.adoption_fee,a.adoption_fee_currency
FROM public.animals a JOIN public.organizations o ON o.id=a.org_id
WHERE a.status='Available' AND o.is_active IS TRUE;
CREATE VIEW public.public_website_content WITH (security_barrier=true) AS
SELECT w.id,w.created_at,w.updated_at,w.org_id,w.page_slug,w.section_key,w.headline,w.subheadline,w.body_text,w.button_text,w.button_link,w.button2_text,w.button2_link,w.background_image_url,w.featured_image_url,w.secondary_image_url,w.is_visible,w.sort_order,w.service_1,w.service_1_description,w.service_1_icon,w.service_2,w.service_2_description,w.service_2_icon,w.service_3,w.service_3_description,w.service_3_icon,w.faq_question_1,w.faq_answer_1,w.faq_question_2,w.faq_answer_2,w.faq_question_3,w.faq_answer_3,w.faq_question_4,w.faq_answer_4,w.faq_question_5,w.faq_answer_5,w.google_reviews_enabled,w.google_business_id,w.footer_organization_name,w.footer_address_line_one,w.footer_address_line_two,w.footer_address_city,w.footer_address_state,w.footer_address_zip,w.footer_phone,w.footer_email,w.footer_copyright,w.footer_ein,w.meta_title,w.meta_description,w.typography FROM public.website_content w JOIN public.organizations o ON o.id=w.org_id
WHERE w.is_visible IS TRUE AND o.is_active IS TRUE;
REVOKE ALL ON public.public_organizations,public.public_animals,public.public_website_content FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.public_organizations,public.public_animals,public.public_website_content TO anon,authenticated;

NOTIFY pgrst, 'reload schema';
