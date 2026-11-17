# Keeping Lumo up to date

Updates arrive as pull requests:

- **Lumo app:** checked daily by **Update Lumo**.
- **Nix dependencies:** checked weekly by Dependabot.
- **GitHub Actions:** checked weekly by Dependabot.

The bots prepare updates, but **you review and merge them**. Nothing auto-merges.

## Before merging

Check that the build passed. For a Lumo update, see the **Update Lumo** workflow;
for a Dependabot update, see **Check**.

After merging, users can update using the commands in the [README](../README.md)
or [system setup guide](advanced.md).

## One-time setup

In **Settings → Actions → General → Workflow permissions**, enable
**Allow GitHub Actions to create and approve pull requests**.

You can start a Lumo release check yourself from **Actions → Update Lumo → Run workflow**.

## Extra branches

Dependabot creates a branch for each update PR. Once its PR is merged, that branch
can be deleted. Enable **Settings → General → Automatically delete head branches**
to have GitHub clean them up for you.
