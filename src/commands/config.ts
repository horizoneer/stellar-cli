/**
 * Interactive configuration wizard command
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { writeConfig, readConfig, StellarConfig } from '../core/config';
import { printInfo, printError } from '../core/formatter';

export interface ConfigWizardOptions {
  location?: string;
}

/**
 * Run interactive configuration wizard
 */
export async function configWizard(options: ConfigWizardOptions): Promise<void> {
  console.log(chalk.blue.bold('\n🔧 Stellar CLI Configuration Wizard\n'));

  const currentConfig = readConfig();

  try {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'network',
        message: 'Select default Stellar network:',
        choices: ['mainnet', 'testnet'],
        default: currentConfig.network || 'mainnet',
      },
      {
        type: 'list',
        name: 'outputFormat',
        message: 'Select default output format:',
        choices: ['terminal', 'json', 'csv'],
        default: currentConfig.outputFormat || 'terminal',
      },
      {
        type: 'number',
        name: 'defaultLimit',
        message: 'Set default limit for list operations:',
        default: currentConfig.defaultLimit || 10,
        validate: (input: number) => input > 0 || 'Limit must be greater than 0',
      },
      {
        type: 'confirm',
        name: 'saveConfig',
        message: 'Save this configuration?',
        default: true,
      },
    ]);

    if (answers.saveConfig) {
      const newConfig: StellarConfig = {
        network: answers.network,
        outputFormat: answers.outputFormat,
        defaultLimit: answers.defaultLimit,
      };

      writeConfig(newConfig, options.location);
      printInfo(`Configuration saved to ${options.location || '~/.stellarrc'}`);
      
      console.log(chalk.green('\n✓ Configuration saved successfully!\n'));
      console.log(chalk.gray('Current configuration:'));
      console.log(JSON.stringify(newConfig, null, 2));
    } else {
      printInfo('Configuration not saved');
    }
  } catch (error: any) {
    if (error.isTtyError) {
      printError('Interactive wizard requires a TTY environment');
      console.log(chalk.yellow('\nYou can manually edit your .stellarrc file instead.\n'));
    } else {
      printError(`Configuration wizard failed: ${error.message}`);
    }
  }
}

/**
 * Registers the config command with the CLI
 */
export function registerConfigCommand(program: any): void {
  program
    .command('config')
    .description('Run interactive configuration wizard')
    .option('-l, --location <path>', 'Custom config file location')
    .action(async (options: ConfigWizardOptions) => {
      await configWizard(options);
    });
}
