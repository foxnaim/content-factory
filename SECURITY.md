# Security policy

## Supported version

The `main` branch is the only supported development line during the MVP phase.

## Reporting a vulnerability

Do not open a public issue containing a token, private URL, personal data or an exploitable production endpoint. Use GitHub's private vulnerability reporting feature when it is enabled for the repository, or contact the repository owner privately.

Include the affected commit, reproduction steps, impact and the smallest safe proof of concept. Remove credentials and private content from logs.

## Deployment boundary

The current release is for localhost or a trusted private network. The Compose file binds exposed services to `127.0.0.1`, but it does not implement user authentication, role-based access control or TLS. Add those controls and a real secret store before any remote or multi-user deployment.

The local Codex adapter must run only on the subscription owner's workstation. Never mount or copy the Codex authentication directory into a container or shared server.

Agent skills are instructions, not trusted executables. Review any contributed `scripts/` for network calls, subprocesses, file access and secret handling. The built-in validation rejects obvious token patterns, but it is not a secret scanner or security proof.

Do not put provider keys, Telegram bot tokens, cookies, channel IDs tied to private deployments, raw customer content or private screenshots in skills, examples or test fixtures. Asset examples must preserve source, owner and license status.
