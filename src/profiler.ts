/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import {BackendTimer} from './kernels/backend';
import {Tensor} from './tensor';
import {TypedArray} from './types';
import * as util from './util';

export class Profiler {
  constructor(private backendTimer: BackendTimer, private logger?: Logger) {
    if (logger == null) {
      this.logger = new Logger();
    }
  }

  profileKernel<T extends Tensor|Tensor[]>(name: string, f: () => T | Tensor[]):
      T {
    let result: T|Tensor[];
    const holdResultWrapperFn = () => {
      result = f();
    };
    const timer = this.backendTimer.time(holdResultWrapperFn);

    const results: Tensor[] =
        Array.isArray(result) ? result : [result] as Tensor[];
    results.forEach(r => {
      const vals = r.dataSync();
      util.checkComputationForNaN(vals, r.dtype, name);

      timer.then(timing => {
        this.logger.logKernelProfile(name, r, vals, timing.kernelMs, timing.subKernels);
      });
    });

    return result as T;
  }
}

export class Logger {
  logKernelProfile(
      name: string, result: Tensor, vals: TypedArray, timeMs: number, subKernels) {
    const time = util.rightPad(`${timeMs}ms`, 9);
    const paddedName = util.rightPad(name, 25);
    const rank = result.rank;
    const size = result.size;
    const shape = util.rightPad(result.shape.toString(), 14);
    console.log(
        `%c${paddedName}\t%c${time}\t%c${rank}D ${shape}\t%c${size}\t%c${subKernels.reduce((acc, curr) => acc + curr.name.substring(0, curr.name.length - 7) + ' ' + curr.ms + 'ms ', '')}`,
        'font-weight:bold', 'color:red', 'color:blue', 'color: orange', 'color: black');
  }
}
