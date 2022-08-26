import { populated_data } from '../../scripts/prepopulate'

export const admin = populated_data.roles[0].id
export const user = populated_data.roles[1].id

const everyone = [admin, user]
const admin_only = [admin]
const disabled = []
export const role_has_perms = {
    migrations: { create: disabled, read: disabled, update: disabled, delete: disabled },
    club_has_users: { create: everyone, read: everyone, update: everyone, delete: everyone },
    clubs: { create: everyone, read: everyone, update: everyone, delete: everyone },
    review_has_photos: { create: everyone, read: everyone, update: everyone, delete: everyone },
    photos: { create: everyone, read: everyone, update: disabled, delete: everyone },
    reviews: { create: everyone, read: everyone, update: everyone, delete: admin_only },
    places: { create: admin_only, read: everyone, update: admin_only, delete: admin_only },
    user_has_roles: {
        create: admin_only,
        read: admin_only,
        update: admin_only,
        delete: admin_only
    },
    roles: { create: admin_only, read: everyone, update: admin_only, delete: admin_only },
    users: { create: admin_only, read: everyone, update: everyone, delete: everyone }
}
