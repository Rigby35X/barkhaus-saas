// ===== INTERNAL FIELDS (Admin Only) =====
// ===== PUBLIC FIELDS (Website + Admin) =====
table mbpr_puppies {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    timestamp updated_at?
    int org? {
      table = "organizations"
    }
  
    text? status?
    text? mbpr_internal_id?
    bool? is_fixed?
    timestamp? estimated_adoption_date?
    text? pups_new_name_from_owner?
    text? orphan_or_mother?
    text? mothers_name?
    text? acquired_from?
    text? dogs_original_name_from_shelter?
    text? shelter_id_info?
    bool? is_with_foster?
    text? foster_name?
    text? foster_contact_info?
    text? dog_name?
    text? litter_name?
    timestamp? birthday?
    bool? birthday_is_estimated?
    text? gender?
    text? microchip_number?
    text? microchip_manufacturer?
    text? vaccination_info?
    timestamp? spay_neuter_date?
    json? spay_neuter_files?
    text? breed_primary?
    text? breed_secondary?
    text? breed_mix?
    text? coat_color?
    text? eye_color?
    text? coat_type?
    text? grooming_maintenance?
    text? temperament_good_with_kids?
    text? temperament_good_with_dogs?
    text? temperament_good_with_cats?
    text? temperament_notes?
    text? estimated_adult_size?
    text? dog_story?
    json? medical_notes?
    image? photo_1?
    image? photo_2?
    image? photo_3?
    image? photo_4?
    image? photo_5?
    text? youtube_video_url?
    image? owner_photo?
    decimal? adoption_fee?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "org"}]}
    {type: "btree", field: [{name: "status"}]}
  ]
}