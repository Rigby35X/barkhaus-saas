table animals {
  auth = false

  schema {
    int id
    int? org? {
      table = "organizations"
    }
  
    // Dog's name
    text name? filters=trim
  
    text litter_name? filters=trim
    text species? filters=trim
  
    // Dog's Breed
    text breed? filters=trim
  
    text description? filters=trim
    text status? filters=trim
  
    // date the dog arrived
    date? intake_date?
  
    text image_url? filters=trim
    image? main_image?
    image? additional_image_1?
    image? additional_image_2?
    image? additional_image_3?
    image? additional_image_4?
  
    // Timestamp of the last update to the animal record
    timestamp updated_at?
  
    // Age of the animal (e.g., "2 years", "6 months")
    text age? filters=trim
  
    // Gender of the animal (Male, Female, Unknown)
    text gender? filters=trim
  
    // Weight of the animal (e.g., "45 lbs", "12 kg")
    text weight? filters=trim
  
    // Color of the animal
    text color? filters=trim
  
    timestamp created_at?=now
  
    // Size of the animal (Small, Medium, Large, Extra Large)
    text size? filters=trim
  
    // Array of additional images for the animal [{url: "..."}, ...]
    json images?
  
    // Detailed description for the animal's detail page
    text description_long? filters=trim
  
    // Current location of the animal (e.g., Foster home, shelter)
    text location? filters=trim
  
    // Indicates if the animal is vaccinated
    bool vaccinated?
  
    // Indicates if the animal is spayed or neutered
    bool spayed_neutered?
  
    // Indicates if the animal has a microchip registered
    bool microchip?
  
    // Notes regarding the animal's medical history
    text medical_notes? filters=trim
  
    // Information about any special needs the animal may have
    text special_needs? filters=trim
  
    // Indicates if the animal is house-trained
    bool house_trained?
  
    // Energy level of the animal (Low, Medium, High)
    text energy_level? filters=trim
  
    // Indicates if the animal is good with kids
    bool good_with_kids?
  
    // Custom organization notes about this animal
    text org_description? filters=trim
  
    // Indicates if the animal is good with other dogs
    bool good_with_dogs?
  
    // Indicates if the animal is good with cats
    bool good_with_cats?
  
    // Notes regarding the animal's training
    text training_notes? filters=trim
  
    // Notes from playgroup interactions
    text playgroup_notes? filters=trim
  
    // Adoption fee for the animal
    decimal adoption_fee?
  
    // Currency of the adoption fee (default: USD)
    text adoption_fee_currency? filters=trim
  
    // Additional organization-specific details
    text org_details? filters=trim
  
    // Indicates if the animal is featured for highlighting
    bool is_featured?
  
    // Priority for sorting (higher = more urgent)
    int priority?
  
    // Staff-only internal notes about the animal
    text internal_notes? filters=trim
  
    // Custom SEO title for the animal's detail page
    text meta_title? filters=trim
  
    // Custom SEO description for social sharing
    text meta_description? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}