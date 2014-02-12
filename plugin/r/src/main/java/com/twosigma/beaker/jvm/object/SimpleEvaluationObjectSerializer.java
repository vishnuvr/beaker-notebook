/*
 *  Copyright 2014 TWO SIGMA INVESTMENTS, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package com.twosigma.beaker.jvm.object;

import java.io.IOException;
import com.google.inject.Inject;
import com.google.inject.Injector;
import com.google.inject.Singleton;
import org.codehaus.jackson.JsonGenerator;
import org.codehaus.jackson.JsonProcessingException;
import org.codehaus.jackson.map.JsonSerializer;
import org.codehaus.jackson.map.SerializerProvider;
import com.twosigma.beaker.jvm.object.SimpleEvaluationObject;
import com.twosigma.beaker.jvm.updater.UpdateManager;

public class SimpleEvaluationObjectSerializer
    extends JsonSerializer<SimpleEvaluationObject>
{
    public SimpleEvaluationObjectSerializer() {
    }
    
    @Override
    public void serialize(SimpleEvaluationObject value,
                          JsonGenerator jgen,
                          SerializerProvider provider)
        throws IOException, JsonProcessingException
    {
        UpdateManager um = UpdateManager.getInstance();
        synchronized (value) {
            String id = um.register(value);
            jgen.writeStartObject();
            jgen.writeObjectField("update_id", id);
            jgen.writeObjectField("expression", value.getExpression());
            jgen.writeObjectField("status", value.getStatus());
            jgen.writeObjectField("result", value.getResult());
            jgen.writeEndObject();
        }
    }
}