use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "portnir", version, about = "List local listening ports")]
struct Cli {
    #[command(subcommand)]
    cmd: Commands,
}

#[derive(Subcommand)]
enum Commands {
    List {
        #[arg(long)]
        json: bool,
        #[arg(long)]
        tcp: bool,
        #[arg(long)]
        udp: bool,
    },
    Check {
        port: u16,
        #[arg(long)]
        json: bool,
    },
    Kill {
        pid: u32,
        #[arg(long)]
        yes: bool,
    },
}

fn main() {
    let cli = Cli::parse();
    match cli.cmd {
        Commands::List { json, tcp, udp } => {
            let mut rows = portnir_core::list_listeners().unwrap_or_else(|e| {
                eprintln!("{e}");
                std::process::exit(1);
            });
            if tcp && !udp {
                rows.retain(|r| r.protocol == "TCP");
            }
            if udp && !tcp {
                rows.retain(|r| r.protocol == "UDP");
            }
            if json {
                println!("{}", serde_json::to_string_pretty(&rows).unwrap());
            } else {
                for r in rows {
                    println!(
                        "{}\t{}\tpid={}\t{}\t{}",
                        r.protocol,
                        r.local_addr,
                        r.pid,
                        r.process_name,
                        r.path.clone().unwrap_or_default()
                    );
                }
            }
        }
        Commands::Check { port, json } => {
            let rows = portnir_core::listeners_on_port(port).unwrap_or_else(|e| {
                eprintln!("{e}");
                std::process::exit(1);
            });
            if json {
                println!("{}", serde_json::to_string_pretty(&rows).unwrap());
            } else if rows.is_empty() {
                println!("nothing listening on {port}");
            } else {
                for r in rows {
                    println!(
                        "{}\t{}\tpid={}\t{}",
                        r.protocol, r.local_addr, r.pid, r.process_name
                    );
                }
            }
        }
        Commands::Kill { pid, yes } => {
            if !yes {
                eprintln!("refusing kill without --yes");
                std::process::exit(2);
            }
            if let Err(e) = portnir_core::kill_pid(pid) {
                eprintln!("{e}");
                std::process::exit(1);
            }
            println!("killed pid {pid}");
        }
    }
}
