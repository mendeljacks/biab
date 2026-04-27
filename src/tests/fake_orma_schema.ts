import { OrmaSchema } from 'orma'

export const fake_orma_schema = {
    $entities: {
        migrations: {
            $database_type: 'postgres' as const,
            $fields: {
                id: {
                    $data_type: 'int' as const,
                    $not_null: true,
                    $default: "nextval('migrations_id_seq'::regclass)"
                },
                run_on: {
                    $data_type: 'timestamp' as const,
                    $not_null: true
                },
                name: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                }
            },
            $primary_key: {
                $fields: ['id']
            }
        },
        users: {
            $database_type: 'postgres' as const,
            $fields: {
                id: {
                    $data_type: 'int' as const,
                    $not_null: true,
                    $default: 'BY DEFAULT'
                },
                created_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                updated_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                email: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                },
                password: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                },
                first_name: {
                    $data_type: 'varchar' as const
                },
                last_name: {
                    $data_type: 'varchar' as const
                },
                phone: {
                    $data_type: 'varchar' as const
                },
                resource_id: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                }
            },
            $primary_key: {
                $fields: ['id']
            },
            $unique_keys: [
                { $fields: ['email'] },
                { $fields: ['phone'] },
                { $fields: ['resource_id'] }
            ]
        },
        user_has_roles: {
            $database_type: 'postgres' as const,
            $fields: {
                id: {
                    $data_type: 'int' as const,
                    $not_null: true,
                    $default: 'BY DEFAULT'
                },
                user_id: {
                    $data_type: 'int' as const,
                    $not_null: true
                },
                role_id: {
                    $data_type: 'int' as const,
                    $not_null: true
                },
                created_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                updated_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                resource_id: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                }
            },
            $primary_key: {
                $fields: ['id']
            },
            $unique_keys: [
                { $fields: ['resource_id'] },
                { $fields: ['role_id', 'user_id'] }
            ],
            $foreign_keys: [
                {
                    $fields: ['user_id'],
                    $references: { $entity: 'users', $fields: ['id'] }
                },
                {
                    $fields: ['role_id'],
                    $references: { $entity: 'roles', $fields: ['id'] }
                }
            ]
        },
        roles: {
            $database_type: 'postgres' as const,
            $fields: {
                id: {
                    $data_type: 'int' as const,
                    $not_null: true,
                    $default: 'BY DEFAULT'
                },
                created_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                updated_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                resource_id: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                },
                name: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                }
            },
            $primary_key: {
                $fields: ['id']
            },
            $unique_keys: [
                { $fields: ['name'] },
                { $fields: ['resource_id'] }
            ]
        },
        reviews: {
            $database_type: 'postgres' as const,
            $fields: {
                id: {
                    $data_type: 'int' as const,
                    $not_null: true,
                    $default: 'BY DEFAULT'
                },
                user_id: {
                    $data_type: 'int' as const,
                    $not_null: true
                },
                place_id: {
                    $data_type: 'int' as const,
                    $not_null: true
                },
                rating: {
                    $data_type: 'int' as const,
                    $not_null: true
                },
                created_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                updated_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                comment: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                },
                resource_id: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                }
            },
            $primary_key: {
                $fields: ['id']
            },
            $unique_keys: [
                { $fields: ['resource_id'] },
                { $fields: ['place_id', 'user_id'] }
            ],
            $foreign_keys: [
                {
                    $fields: ['user_id'],
                    $references: { $entity: 'users', $fields: ['id'] }
                },
                {
                    $fields: ['place_id'],
                    $references: { $entity: 'places', $fields: ['id'] }
                }
            ]
        },
        places: {
            $database_type: 'postgres' as const,
            $fields: {
                id: {
                    $data_type: 'int' as const,
                    $not_null: true,
                    $default: 'BY DEFAULT'
                },
                created_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                updated_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                resource_id: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                },
                name: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                },
                google_place_id: {
                    $data_type: 'varchar' as const
                }
            },
            $primary_key: {
                $fields: ['id']
            },
            $unique_keys: [
                { $fields: ['google_place_id'] },
                { $fields: ['name'] },
                { $fields: ['resource_id'] }
            ]
        },
        review_has_photos: {
            $database_type: 'postgres' as const,
            $fields: {
                id: {
                    $data_type: 'int' as const,
                    $not_null: true,
                    $default: 'BY DEFAULT'
                },
                review_id: {
                    $data_type: 'int' as const,
                    $not_null: true
                },
                photo_id: {
                    $data_type: 'int' as const,
                    $not_null: true
                },
                created_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                updated_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                resource_id: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                }
            },
            $primary_key: {
                $fields: ['id']
            },
            $unique_keys: [
                { $fields: ['resource_id'] },
                { $fields: ['photo_id', 'review_id'] }
            ],
            $foreign_keys: [
                {
                    $fields: ['review_id'],
                    $references: { $entity: 'reviews', $fields: ['id'] }
                },
                {
                    $fields: ['photo_id'],
                    $references: { $entity: 'photos', $fields: ['id'] }
                }
            ]
        },
        photos: {
            $database_type: 'postgres' as const,
            $fields: {
                id: {
                    $data_type: 'int' as const,
                    $not_null: true,
                    $default: 'BY DEFAULT'
                },
                created_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                updated_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                resource_id: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                },
                url: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                }
            },
            $primary_key: {
                $fields: ['id']
            },
            $unique_keys: [
                { $fields: ['resource_id'] },
                { $fields: ['url'] }
            ]
        },
        clubs: {
            $database_type: 'postgres' as const,
            $fields: {
                id: {
                    $data_type: 'int' as const,
                    $not_null: true,
                    $default: 'BY DEFAULT'
                },
                photo_id: {
                    $data_type: 'int' as const,
                    $not_null: true
                },
                created_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                updated_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                resource_id: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                },
                name: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                }
            },
            $primary_key: {
                $fields: ['id']
            },
            $unique_keys: [
                { $fields: ['name'] },
                { $fields: ['resource_id'] }
            ],
            $foreign_keys: [
                {
                    $fields: ['photo_id'],
                    $references: { $entity: 'photos', $fields: ['id'] }
                }
            ]
        },
        club_has_users: {
            $database_type: 'postgres' as const,
            $fields: {
                id: {
                    $data_type: 'int' as const,
                    $not_null: true,
                    $default: 'BY DEFAULT'
                },
                club_id: {
                    $data_type: 'int' as const,
                    $not_null: true
                },
                user_id: {
                    $data_type: 'int' as const,
                    $not_null: true
                },
                is_admin: {
                    $data_type: 'boolean' as const,
                    $not_null: true
                },
                created_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                updated_at: {
                    $data_type: 'timestamp' as const,
                    $not_null: true,
                    $default: 'now()'
                },
                resource_id: {
                    $data_type: 'varchar' as const,
                    $not_null: true
                }
            },
            $primary_key: {
                $fields: ['id']
            },
            $unique_keys: [
                { $fields: ['user_id', 'club_id'] },
                { $fields: ['resource_id'] }
            ],
            $foreign_keys: [
                {
                    $fields: ['club_id'],
                    $references: { $entity: 'clubs', $fields: ['id'] }
                },
                {
                    $fields: ['user_id'],
                    $references: { $entity: 'users', $fields: ['id'] }
                }
            ]
        }
    }
} as any as OrmaSchema
