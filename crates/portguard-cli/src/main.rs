use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "portguard", version, about = "List local listening ports")]
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
        Commands::List { .. } => println!("[]"),
        Commands::Check { port, .. } => println!("nothing listening on {port}"),
        Commands::Kill { yes, .. } if !yes => {
            eprintln!("refusing kill without --yes");
            std::process::exit(2);
        }
        Commands::Kill { .. } => eprintln!("not implemented"),
    }
}
