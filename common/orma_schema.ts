export const orma_schema = {
  "migrations": {
    "id": {
      "data_type": "bigint",
      "ordinal_position": 1,
      "not_null": true,
      "character_count": 64,
      "default": "unique_rowid()"
    },
    "name": {
      "data_type": "character varying",
      "ordinal_position": 2,
      "not_null": true,
      "character_count": 255
    },
    "run_on": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 3,
      "not_null": true,
      "decimal_places": 6
    },
    "$indexes": [
      {
        "index_name": "migrations_pkey",
        "is_unique": true,
        "fields": [
          "id"
        ],
        "invisible": false
      }
    ]
  },
  "users": {
    "id": {
      "data_type": "bigint",
      "ordinal_position": 1,
      "not_null": true,
      "primary_key": true,
      "character_count": 64,
      "default": "nextval('public.users_id_seq'::REGCLASS)"
    },
    "email": {
      "data_type": "character varying",
      "ordinal_position": 2,
      "not_null": true,
      "character_count": 10485760
    },
    "password": {
      "data_type": "character varying",
      "ordinal_position": 3,
      "not_null": true,
      "character_count": 10485760
    },
    "first_name": {
      "data_type": "character varying",
      "ordinal_position": 4,
      "character_count": 10485760
    },
    "last_name": {
      "data_type": "character varying",
      "ordinal_position": 5,
      "character_count": 10485760
    },
    "phone": {
      "data_type": "character varying",
      "ordinal_position": 6,
      "character_count": 10485760
    },
    "created_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 7,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "updated_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 8,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "resource_id": {
      "data_type": "character varying",
      "ordinal_position": 9,
      "not_null": true,
      "character_count": 10485760
    },
    "$indexes": [
      {
        "index_name": "users_email_uq",
        "is_unique": true,
        "fields": [
          "email"
        ],
        "invisible": false
      },
      {
        "index_name": "users_phone_uq",
        "is_unique": true,
        "fields": [
          "phone"
        ],
        "invisible": false
      },
      {
        "index_name": "users_resource_id_uq",
        "is_unique": true,
        "fields": [
          "resource_id"
        ],
        "invisible": false
      },
      {
        "index_name": "users_pkey",
        "is_unique": true,
        "fields": [
          "id"
        ],
        "invisible": false
      }
    ]
  },
  "roles": {
    "id": {
      "data_type": "bigint",
      "ordinal_position": 1,
      "not_null": true,
      "primary_key": true,
      "character_count": 64,
      "default": "nextval('public.roles_id_seq'::REGCLASS)"
    },
    "name": {
      "data_type": "character varying",
      "ordinal_position": 2,
      "not_null": true,
      "character_count": 10485760
    },
    "created_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 3,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "updated_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 4,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "resource_id": {
      "data_type": "character varying",
      "ordinal_position": 5,
      "not_null": true,
      "character_count": 10485760
    },
    "$indexes": [
      {
        "index_name": "roles_name_uq",
        "is_unique": true,
        "fields": [
          "name"
        ],
        "invisible": false
      },
      {
        "index_name": "roles_resource_id_uq",
        "is_unique": true,
        "fields": [
          "resource_id"
        ],
        "invisible": false
      },
      {
        "index_name": "roles_pkey",
        "is_unique": true,
        "fields": [
          "id"
        ],
        "invisible": false
      }
    ]
  },
  "user_has_roles": {
    "id": {
      "data_type": "bigint",
      "ordinal_position": 1,
      "not_null": true,
      "primary_key": true,
      "character_count": 64,
      "default": "nextval('public.user_has_roles_id_seq'::REGCLASS)"
    },
    "user_id": {
      "data_type": "bigint",
      "ordinal_position": 2,
      "not_null": true,
      "character_count": 64,
      "references": {
        "users": {
          "id": {}
        }
      }
    },
    "role_id": {
      "data_type": "bigint",
      "ordinal_position": 3,
      "not_null": true,
      "character_count": 64,
      "references": {
        "roles": {
          "id": {}
        }
      }
    },
    "created_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 4,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "updated_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 5,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "resource_id": {
      "data_type": "character varying",
      "ordinal_position": 6,
      "not_null": true,
      "character_count": 10485760
    },
    "$indexes": [
      {
        "index_name": "user_has_roles_user_id_role_id_uq",
        "is_unique": true,
        "fields": [
          "role_id",
          "user_id"
        ],
        "invisible": false
      },
      {
        "index_name": "user_has_roles_resource_id_uq",
        "is_unique": true,
        "fields": [
          "resource_id"
        ],
        "invisible": false
      },
      {
        "index_name": "user_has_roles_pkey",
        "is_unique": true,
        "fields": [
          "id"
        ],
        "invisible": false
      }
    ]
  },
  "places": {
    "id": {
      "data_type": "bigint",
      "ordinal_position": 1,
      "not_null": true,
      "primary_key": true,
      "character_count": 64,
      "default": "nextval('public.places_id_seq'::REGCLASS)"
    },
    "name": {
      "data_type": "character varying",
      "ordinal_position": 2,
      "not_null": true,
      "character_count": 10485760
    },
    "google_place_id": {
      "data_type": "character varying",
      "ordinal_position": 3,
      "character_count": 10485760
    },
    "created_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 4,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "updated_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 5,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "resource_id": {
      "data_type": "character varying",
      "ordinal_position": 6,
      "not_null": true,
      "character_count": 10485760
    },
    "$indexes": [
      {
        "index_name": "places_google_place_id_uq",
        "is_unique": true,
        "fields": [
          "google_place_id"
        ],
        "invisible": false
      },
      {
        "index_name": "places_name_uq",
        "is_unique": true,
        "fields": [
          "name"
        ],
        "invisible": false
      },
      {
        "index_name": "places_resource_id_uq",
        "is_unique": true,
        "fields": [
          "resource_id"
        ],
        "invisible": false
      },
      {
        "index_name": "places_pkey",
        "is_unique": true,
        "fields": [
          "id"
        ],
        "invisible": false
      }
    ]
  },
  "reviews": {
    "id": {
      "data_type": "bigint",
      "ordinal_position": 1,
      "not_null": true,
      "primary_key": true,
      "character_count": 64,
      "default": "nextval('public.reviews_id_seq'::REGCLASS)"
    },
    "user_id": {
      "data_type": "bigint",
      "ordinal_position": 2,
      "not_null": true,
      "character_count": 64,
      "references": {
        "users": {
          "id": {}
        }
      }
    },
    "place_id": {
      "data_type": "bigint",
      "ordinal_position": 3,
      "not_null": true,
      "character_count": 64,
      "references": {
        "places": {
          "id": {}
        }
      }
    },
    "rating": {
      "data_type": "bigint",
      "ordinal_position": 4,
      "not_null": true,
      "character_count": 64
    },
    "comment": {
      "data_type": "character varying",
      "ordinal_position": 5,
      "not_null": true,
      "character_count": 10485760
    },
    "created_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 6,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "updated_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 7,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "resource_id": {
      "data_type": "character varying",
      "ordinal_position": 8,
      "not_null": true,
      "character_count": 10485760
    },
    "$indexes": [
      {
        "index_name": "reviews_resource_id_uq",
        "is_unique": true,
        "fields": [
          "resource_id"
        ],
        "invisible": false
      },
      {
        "index_name": "reviews_pkey",
        "is_unique": true,
        "fields": [
          "id"
        ],
        "invisible": false
      },
      {
        "index_name": "reviews_user_id_place_id_uq",
        "is_unique": true,
        "fields": [
          "place_id",
          "user_id"
        ],
        "invisible": false
      }
    ]
  },
  "photos": {
    "id": {
      "data_type": "bigint",
      "ordinal_position": 1,
      "not_null": true,
      "primary_key": true,
      "character_count": 64,
      "default": "nextval('public.photos_id_seq'::REGCLASS)"
    },
    "url": {
      "data_type": "bigint",
      "ordinal_position": 2,
      "not_null": true,
      "character_count": 64
    },
    "created_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 3,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "updated_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 4,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "resource_id": {
      "data_type": "character varying",
      "ordinal_position": 5,
      "not_null": true,
      "character_count": 10485760
    },
    "$indexes": [
      {
        "index_name": "photos_url_uq",
        "is_unique": true,
        "fields": [
          "url"
        ],
        "invisible": false
      },
      {
        "index_name": "photos_resource_id_uq",
        "is_unique": true,
        "fields": [
          "resource_id"
        ],
        "invisible": false
      },
      {
        "index_name": "photos_pkey",
        "is_unique": true,
        "fields": [
          "id"
        ],
        "invisible": false
      }
    ]
  },
  "review_has_photos": {
    "id": {
      "data_type": "bigint",
      "ordinal_position": 1,
      "not_null": true,
      "primary_key": true,
      "character_count": 64,
      "default": "nextval('public.review_has_photos_id_seq'::REGCLASS)"
    },
    "review_id": {
      "data_type": "bigint",
      "ordinal_position": 2,
      "not_null": true,
      "character_count": 64,
      "references": {
        "reviews": {
          "id": {}
        }
      }
    },
    "photo_id": {
      "data_type": "bigint",
      "ordinal_position": 3,
      "not_null": true,
      "character_count": 64,
      "references": {
        "photos": {
          "id": {}
        }
      }
    },
    "created_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 4,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "updated_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 5,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "resource_id": {
      "data_type": "character varying",
      "ordinal_position": 6,
      "not_null": true,
      "character_count": 10485760
    },
    "$indexes": [
      {
        "index_name": "review_has_photos_review_id_photo_id_uq",
        "is_unique": true,
        "fields": [
          "photo_id",
          "review_id"
        ],
        "invisible": false
      },
      {
        "index_name": "review_has_photos_resource_id_uq",
        "is_unique": true,
        "fields": [
          "resource_id"
        ],
        "invisible": false
      },
      {
        "index_name": "review_has_photos_pkey",
        "is_unique": true,
        "fields": [
          "id"
        ],
        "invisible": false
      }
    ]
  },
  "clubs": {
    "id": {
      "data_type": "bigint",
      "ordinal_position": 1,
      "not_null": true,
      "primary_key": true,
      "character_count": 64,
      "default": "nextval('public.clubs_id_seq'::REGCLASS)"
    },
    "name": {
      "data_type": "character varying",
      "ordinal_position": 2,
      "not_null": true,
      "character_count": 10485760
    },
    "photo_id": {
      "data_type": "bigint",
      "ordinal_position": 3,
      "not_null": true,
      "character_count": 64,
      "references": {
        "photos": {
          "id": {}
        }
      }
    },
    "created_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 4,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "updated_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 5,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "resource_id": {
      "data_type": "character varying",
      "ordinal_position": 6,
      "not_null": true,
      "character_count": 10485760
    },
    "$indexes": [
      {
        "index_name": "clubs_resource_id_uq",
        "is_unique": true,
        "fields": [
          "resource_id"
        ],
        "invisible": false
      },
      {
        "index_name": "clubs_pkey",
        "is_unique": true,
        "fields": [
          "id"
        ],
        "invisible": false
      },
      {
        "index_name": "clubs_name_uq",
        "is_unique": true,
        "fields": [
          "name"
        ],
        "invisible": false
      }
    ]
  },
  "club_has_users": {
    "id": {
      "data_type": "bigint",
      "ordinal_position": 1,
      "not_null": true,
      "primary_key": true,
      "character_count": 64,
      "default": "nextval('public.club_has_users_id_seq'::REGCLASS)"
    },
    "club_id": {
      "data_type": "bigint",
      "ordinal_position": 2,
      "not_null": true,
      "character_count": 64,
      "references": {
        "clubs": {
          "id": {}
        }
      }
    },
    "user_id": {
      "data_type": "bigint",
      "ordinal_position": 3,
      "not_null": true,
      "character_count": 64,
      "references": {
        "users": {
          "id": {}
        }
      }
    },
    "is_admin": {
      "data_type": "boolean",
      "ordinal_position": 4,
      "not_null": true
    },
    "created_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 5,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "updated_at": {
      "data_type": "timestamp without time zone",
      "ordinal_position": 6,
      "not_null": true,
      "decimal_places": 6,
      "default": "now():::TIMESTAMP"
    },
    "resource_id": {
      "data_type": "character varying",
      "ordinal_position": 7,
      "not_null": true,
      "character_count": 10485760
    },
    "$indexes": [
      {
        "index_name": "club_has_users_club_id_user_id_uq",
        "is_unique": true,
        "fields": [
          "user_id",
          "club_id"
        ],
        "invisible": false
      },
      {
        "index_name": "club_has_users_resource_id_uq",
        "is_unique": true,
        "fields": [
          "resource_id"
        ],
        "invisible": false
      },
      {
        "index_name": "club_has_users_pkey",
        "is_unique": true,
        "fields": [
          "id"
        ],
        "invisible": false
      }
    ]
  }
} as const