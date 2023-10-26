import { spawn } from "child_process";
import { promisify } from "util";

export const spawnAsync = (
    cmd: string,
    args: ReadonlyArray<string>
)=> new Promise((resolve, reject) => {
    const cp = 
})