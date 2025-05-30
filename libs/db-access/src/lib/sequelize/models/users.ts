import {
  Sequelize,
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Association,
  HasManyGetAssociationsMixin,
  BelongsToManyAddAssociationMixin,
  BelongsToManyGetAssociationsMixin,
} from 'sequelize';
import bcrypt from 'bcryptjs';
import { AppRole } from './Role';
import config from '@b2b-tickets/config';

export class B2BUser extends Model<
  InferAttributes<B2BUser>,
  InferCreationAttributes<B2BUser>
> {
  declare user_id: number;
  declare customer_id: number;
  declare username: string;
  declare password: string;
  declare password_change_date: Date;
  declare first_name: string;
  declare last_name: string;
  declare mobile_phone?: string;
  declare email?: string;
  declare authentication_type: string;
  declare change_password: string;
  declare is_active: string;
  declare is_locked: string;
  declare locked_reason?: string;
  declare last_login_attempt: Date;
  declare last_login_status: string;
  declare last_login_failed_attempts?: number;
  declare record_version: number;
  declare creation_date: Date;
  declare creation_user: string;
  declare last_update_date?: Date;
  declare last_update_user?: string;
  declare last_update_process: string;
  declare two_factor_secret?: string;
  declare lastotpsent?: string;
  declare mfa_method?: string;

  // Association methods for B2BUser
  declare getRoles: BelongsToManyGetAssociationsMixin<AppRole>;

  declare addRole: BelongsToManyAddAssociationMixin<AppRole, number>;

  // Define an instance method to compare passwords
  public async comparePassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
  }

  // Static method to initialize the model
  public static initModel(sequelize: Sequelize): typeof B2BUser {
    return B2BUser.init(
      {
        user_id: {
          type: DataTypes.DECIMAL,
          allowNull: false,
          primaryKey: true,
        },
        customer_id: {
          type: DataTypes.DECIMAL,
          allowNull: false,
          references: {
            model: 'customers',
            key: 'customer_id',
          },
        },
        username: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        password: {
          type: DataTypes.STRING(4000),
          allowNull: false,
        },
        password_change_date: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        first_name: {
          type: DataTypes.STRING(200),
          allowNull: false,
        },
        last_name: {
          type: DataTypes.STRING(200),
          allowNull: false,
        },
        mobile_phone: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        email: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        authentication_type: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        change_password: {
          type: DataTypes.STRING(1),
          allowNull: false,
        },
        is_active: {
          type: DataTypes.STRING(1),
          allowNull: false,
        },
        is_locked: {
          type: DataTypes.STRING(1),
          allowNull: false,
        },
        locked_reason: {
          type: DataTypes.STRING(4000),
          allowNull: true,
        },
        last_login_attempt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        last_login_status: {
          type: DataTypes.STRING(1),
          allowNull: false,
        },
        last_login_failed_attempts: {
          type: DataTypes.DECIMAL,
          allowNull: true,
        },
        record_version: {
          type: DataTypes.DECIMAL,
          allowNull: false,
        },
        creation_date: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        creation_user: {
          type: DataTypes.STRING(150),
          allowNull: false,
        },
        last_update_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        last_update_user: {
          type: DataTypes.STRING(150),
          allowNull: true,
        },
        last_update_process: {
          type: DataTypes.STRING(250),
          allowNull: false,
        },
        two_factor_secret: {
          type: DataTypes.STRING(250),
          allowNull: true,
        },
        lastotpsent: {
          type: DataTypes.STRING(140),
          allowNull: true,
        },
        mfa_method: {
          type: DataTypes.STRING(1),
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'users',
        timestamps: false,
        indexes: [
          {
            name: 'users_pk',
            unique: true,
            fields: [{ name: 'user_id' }],
          },
          {
            name: 'usr_cust_fki',
            fields: [{ name: 'customer_id' }],
          },
          {
            name: 'usr_uk1',
            unique: true,
            fields: [{ name: 'customer_id' }],
          },
        ],
        defaultScope: {
          attributes: { exclude: ['password'] },
        },
        scopes: {
          withPassword: {
            attributes: [
              'user_id',
              'customer_id',
              'first_name',
              'last_name',
              'username',
              'password',
              'email',
              'mobile_phone',
              'is_active',
              'is_locked',
              'authentication_type',
              'change_password',
              'two_factor_secret',
              'lastotpsent',
              'mfa_method',
            ],
          },
        },
        hooks: {
          beforeCreate: async (user) => {
            if (user.password) {
              if (!B2BUser.isPasswordComplex(user.password)) {
                throw new Error(
                  'Password does not meet complexity requirements'
                );
              }
              const salt = await bcrypt.genSalt(10);
              user.password = await bcrypt.hash(user.password, salt);
            }
          },
          beforeUpdate: async (user) => {
            // if (!B2BUser.isPasswordComplex(user.password)) {
            //   throw new Error('Password does not meet complexity requirements');
            // }
            if (user.changed('password')) {
              const salt = await bcrypt.genSalt(10);
              user.password = await bcrypt.hash(user.password, salt);
            }
          },
        },
      }
    );
  }

  // Static method to check password complexity
  static isPasswordComplex(password: string) {
    // Check if Password Complexity is activated
    if (!config.PasswordComplexityActive) return true;

    const minCharacters = config.MinimumPasswordCharacters;

    const minLength = new RegExp(`.{${minCharacters},}`);
    const hasUpperCase = /[A-Z]/;
    const hasLowerCase = /[a-z]/;
    const hasNumber = /\d/;
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/;

    return (
      minLength.test(password) &&
      hasUpperCase.test(password) &&
      hasLowerCase.test(password) &&
      hasNumber.test(password) &&
      hasSpecialChar.test(password)
    );
  }
}
